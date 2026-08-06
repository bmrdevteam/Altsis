import _ from "lodash";
import { matchesDataFilter } from "editor/functions/dataConnFilters";

export type TDocsReviewSnapshot = {
  title: string;
  content: string;
  fieldNames: string[];
  studentLabel?: string;
};

const MAX_CONTENT_CHARS = 14000;
const MAX_VALUE_CHARS = 800;
const MAX_FIELD_NAMES = 40;

const truncate = (text: string, max: number) => {
  const value = String(text || "");
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const isImageValue = (v: unknown): v is { key: string; originalName: string } =>
  isPlainObject(v) && "key" in v && "originalName" in v;

const formatCell = (value: unknown): string => {
  if (value == null) return "";
  if (isImageValue(value)) {
    return `[이미지: ${value.originalName || "첨부"}]`;
  }
  if (typeof value === "string" || typeof value === "number") {
    return truncate(String(value), MAX_VALUE_CHARS);
  }
  if (typeof value === "boolean") return value ? "예" : "아니오";
  if (Array.isArray(value)) {
    return truncate(
      value
        .map((v) => formatCell(v))
        .filter(Boolean)
        .join(", "),
      MAX_VALUE_CHARS
    );
  }
  return "";
};

type DataLocationEl = { tag: "DATA"; location: string };

const locationsOfCell = (cell: any): string[] => {
  if (cell?.type !== "data" || !Array.isArray(cell?.dataText)) return [];
  const locations: string[] = [];
  for (const el of cell.dataText as unknown[]) {
    if (
      !!el &&
      typeof el === "object" &&
      (el as DataLocationEl).tag === "DATA" &&
      (el as DataLocationEl).location
    ) {
      locations.push(String((el as DataLocationEl).location));
    }
  }
  return locations;
};

const pushFieldName = (fieldNames: string[], name: string) => {
  if (!name || fieldNames.includes(name) || fieldNames.length >= MAX_FIELD_NAMES) {
    return;
  }
  fieldNames.push(name);
};

/** ParsedTableBlock 과 동일하게 repeat 행을 정렬·필터·max 처리 */
const shapeRepeatRows = (tableData: any, rawRows: unknown): any[] => {
  let repeat = _.cloneDeep(
    Array.isArray(rawRows) ? rawRows : []
  ) as Record<string, any>[];

  const sortInfo = tableData?.dataOrder;
  if (Array.isArray(sortInfo) && sortInfo.length > 0 && repeat.length > 0) {
    const sortByArray = _.map(sortInfo, "by");
    const sortOrderArray = _.map(sortInfo, "order");
    const sortPriorityArray = _.map(sortInfo, "priority");

    let matchedItem: any[] = [];
    _.forEach(sortPriorityArray, (item: any, index: number) => {
      if (!item) return;
      const priorityArray = String(item).split("/");
      const byArray = sortByArray[index];
      _.forEach(priorityArray, (priorityVal: any) => {
        matchedItem = [
          ...matchedItem,
          ..._.orderBy(
            _.filter(repeat, (v) => v?.[byArray] === priorityVal),
            sortByArray,
            sortOrderArray as any
          ),
        ];
      });
    });
    const unmatchedItem = _.orderBy(
      _.difference(repeat, matchedItem),
      sortByArray,
      sortOrderArray as any
    );
    repeat = [...matchedItem, ...unmatchedItem];
  }

  if (Array.isArray(tableData?.dataCellFilter) && tableData.dataCellFilter.length > 0) {
    for (const item of repeat) {
      const blankCells: string[] = [];
      for (const filter of tableData.dataCellFilter) {
        if (!matchesDataFilter(item, filter) && filter?.cell) {
          blankCells.push(filter.cell);
        }
      }
      for (const cell of blankCells) {
        item[cell] = null;
      }
    }
  }

  let filtered = repeat.filter((v) => {
    if (
      Array.isArray(tableData?.dataFilter) &&
      tableData.dataFilter.length > 0 &&
      tableData.dataFilter.some((filter: any) => !matchesDataFilter(v, filter))
    ) {
      return false;
    }
    if (
      Array.isArray(tableData?.dataOrFilter) &&
      tableData.dataOrFilter.length > 0 &&
      !tableData.dataOrFilter.some((filter: any) => matchesDataFilter(v, filter))
    ) {
      return false;
    }
    return true;
  });

  // evaluation 단위수 합산 (화면 렌더와 동일)
  const trackList: Record<string, number> = {};
  for (const row of filtered) {
    for (const k of Object.keys(row || {})) {
      if (!k.includes("단위수") || k.includes("[합산]")) continue;
      const n = parseFloat(row[k]);
      if (!Number.isFinite(n)) continue;
      trackList[`${k}[합산]`] = (trackList[`${k}[합산]`] || 0) + n;
    }
  }
  for (const row of filtered) {
    for (const k of Object.keys(trackList)) {
      row[k] = trackList[k];
    }
  }

  const max = tableData?.dataRepeat?.max;
  if (typeof max === "number" && max > 0) {
    filtered = filtered.slice(0, max);
  }

  return filtered;
};

const collectVisibleKeys = (tableData: any): string[] => {
  const keys: string[] = [];
  const rows: any[] = Array.isArray(tableData?.table) ? tableData.table : [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      for (const loc of locationsOfCell(cell)) {
        const parts = loc.split("//");
        const key = parts[parts.length - 1];
        if (key && !keys.includes(key)) keys.push(key);
      }
    }
  }
  return keys;
};

const serializeFromFormTemplate = (
  formData: any,
  dbData: any,
  fieldNames: string[],
  lines: string[]
): boolean => {
  const blocks: any[] = Array.isArray(formData?.data) ? formData.data : [];
  let emitted = false;
  const seenSingle = new Set<string>();

  for (const block of blocks) {
    if (block?.type !== "table") continue;
    const tableData = block.data || {};
    const cells: any[] = (Array.isArray(tableData.table) ? tableData.table : []).flat();
    const hasDataCell = cells.some(
      (c) => c?.type === "data" && locationsOfCell(c).length > 0
    );
    if (!hasDataCell) continue;

    const repeatBy = String(tableData?.dataRepeat?.by || "").trim();
    if (repeatBy) {
      const byParts = repeatBy.split("//");
      const sectionLabel =
        byParts.slice(1).join(" / ") || byParts[byParts.length - 1] || "반복 항목";
      const visibleKeys = collectVisibleKeys(tableData);
      if (visibleKeys.length === 0) continue;

      const rows = shapeRepeatRows(tableData, _.get(dbData, byParts, []));
      lines.push(`## ${sectionLabel}`);
      pushFieldName(fieldNames, sectionLabel);

      if (rows.length === 0) {
        lines.push("(표시 가능한 행 없음)");
        lines.push("");
        emitted = true;
        continue;
      }

      for (const row of rows) {
        const headingBits = [
          formatCell(row?.["학년도"]),
          formatCell(row?.["학년"]) && `${formatCell(row?.["학년"])}학년`,
          [formatCell(row?.["교과"]), formatCell(row?.["과목"])]
            .filter(Boolean)
            .join(" "),
        ].filter(Boolean);
        if (headingBits.length > 0) {
          lines.push(`### ${headingBits.join(" · ")}`);
        }
        let rowHasValue = false;
        for (const key of visibleKeys) {
          const txt = formatCell(row?.[key]);
          if (!txt) continue;
          lines.push(`- ${key}: ${txt}`);
          pushFieldName(fieldNames, `${sectionLabel} / ${key}`);
          rowHasValue = true;
          emitted = true;
        }
        if (!rowHasValue) {
          lines.push("(빈 행)");
        }
        lines.push("");
      }
      continue;
    }

    // 단일 셀(비반복) 바인딩
    for (const cell of cells) {
      for (const loc of locationsOfCell(cell)) {
        if (seenSingle.has(loc)) continue;
        seenSingle.add(loc);
        const parts = loc.split("//");
        if (parts.length < 2) continue;
        const label = parts.slice(2).join(" / ") || parts[parts.length - 1];
        const txt = formatCell(_.get(dbData, parts, ""));
        if (!txt) continue;
        lines.push(`- ${label}: ${txt}`);
        pushFieldName(fieldNames, label);
        emitted = true;
      }
    }
  }

  return emitted;
};

/**
 * 문서함(인쇄 양식)에서 **현재 화면에 표시되는 바인딩 필드만** 점검용 텍스트로 직렬화한다.
 * formData(선택 양식 템플릿)의 DATA location / dataRepeat 를 기준으로 한다.
 */
export const serializeDocsForReview = (params: {
  formTitle?: string;
  studentLabel?: string;
  formData?: any;
  dbData?: any;
}): TDocsReviewSnapshot => {
  const formTitle = String(params.formTitle || "문서").trim() || "문서";
  const studentLabel = String(params.studentLabel || "").trim();
  const fieldNames: string[] = [];
  const lines: string[] = [];
  lines.push(`# ${formTitle}`);
  if (studentLabel) {
    lines.push(`학생: ${studentLabel}`);
  }
  lines.push("");

  const hasFormBlocks = Array.isArray(params.formData?.data);
  if (!hasFormBlocks) {
    lines.push(
      "(인쇄 양식이 없어 화면에 표시된 항목을 확인할 수 없습니다. 양식을 선택한 뒤 다시 점검해 주세요.)"
    );
  } else {
    const emitted = serializeFromFormTemplate(
      params.formData,
      params.dbData,
      fieldNames,
      lines
    );
    if (!emitted) {
      lines.push(
        "(선택한 양식에 데이터 연결 칸이 없거나, 표시할 값이 없습니다.)"
      );
    }
  }

  return {
    title: studentLabel ? `${formTitle} · ${studentLabel}` : formTitle,
    content: truncate(lines.join("\n").trim(), MAX_CONTENT_CHARS),
    fieldNames,
    studentLabel: studentLabel || undefined,
  };
};
