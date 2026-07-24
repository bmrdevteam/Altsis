import { useEffect, useMemo, useRef, useState } from "react";
import style from "./altBoard.module.scss";
import { TBoard } from "types/board";
import { TAltForm, TAltFormField } from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAuth } from "contexts/authContext";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Svg from "assets/svg/Svg";
import SheetColHeader from "./SheetColHeader";
import DateRangeFilterDropdown, {
  DateRange,
} from "components/dateRangeFilter/DateRangeFilterDropdown";
import MergeStyleFilterBar from "components/mergeFilter/MergeStyleFilterBar";
import { MarkdownEditor, MarkdownViewer } from "components/markdown";
import { isCurrentApprover, normalizeApprovalValue } from "utils/approvalLine";

type Props = {
  board: TBoard;
  forms: TAltForm[];
  canManage: boolean;
  canDeleteAnyRow: boolean;
  initialFormId?: string;
  onFormSelect?: (formId: string) => void;
  onFormDeselect?: () => void;
  onCopySheetLink?: (formId: string) => void;
};

type SortConfig = {
  fieldId: string;
  direction: "asc" | "desc";
} | null;

const AltSheetView = ({
  board,
  forms,
  canManage,
  canDeleteAnyRow,
  initialFormId,
  onFormSelect,
  onFormDeselect,
  onCopySheetLink,
}: Props) => {
  const { AltSheetRowAPI, FileAPI, PostAPI } = useAPIv2();
  const { currentUser } = useAuth();

  const handleEditorImageUpload = async (
    file: File
  ): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await PostAPI.CUploadPostFile({ data: formData });
      return `${process.env.REACT_APP_SERVER_URL}/api/posts/file/view?key=${encodeURIComponent(result.key)}`;
    } catch (err) {
      ALERT_ERROR(err);
      return null;
    }
  };

  const [selectedFormId, setSelectedFormId] = useState<string>(
    initialFormId || ""
  );
  const [rows, setRows] = useState<TAltSheetRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 인라인 편집 상태
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    fieldId: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Phase 3: 필터, 정렬, 컬럼 숨기기
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateFilters, setDateFilters] = useState<Record<string, DateRange>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // 승인 사유 입력
  const [approvalReason, setApprovalReason] = useState<
    Record<string, string>
  >({});

  // 뷰 모드: 테이블 or 문서
  const [viewMode, setViewMode] = useState<"table" | "doc">("doc");

  // 문서 뷰 편집 상태
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [docEditData, setDocEditData] = useState<Record<string, any>>({});
  /** 문서 보기: 필터된 행 기준 현재 index */
  const [docIndex, setDocIndex] = useState(0);
  /** 문서 보기: 키워드 검색 (머지 UI와 동일) */
  const [docKeyword, setDocKeyword] = useState("");

  // 응답 삭제 확인
  const [deleteTargetRow, setDeleteTargetRow] = useState<TAltSheetRow | null>(
    null
  );
  const [isDeletingRow, setIsDeletingRow] = useState(false);

  const selectedForm = forms.find((f) => f._id === selectedFormId);

  // 표시할 필드: 문서(content) 제외. 관리자는 전체, 응답자는 respondent + visibleToRespondent
  const allVisibleFields: TAltFormField[] = selectedForm
    ? (canManage
        ? selectedForm.fields
        : selectedForm.fields.filter(
            (f) =>
              f.permission === "respondent" ||
              (f.permission === "owner" &&
                (f.visibleToRespondent || selectedForm.settings.showOwnerFields))
          )
      ).filter((f) => f.type !== "content")
    : [];

  // 숨김 컬럼 적용
  const visibleFields = allVisibleFields.filter(
    (f) => !hiddenColumns.has(f._id)
  );

  // 퀴즈 모드 여부
  const isQuiz = selectedForm?.settings.quizMode;

  // localStorage에서 숨김 컬럼 복원
  useEffect(() => {
    if (!selectedFormId) return;
    const stored = localStorage.getItem(
      `altSheet_${selectedFormId}_hiddenColumns`
    );
    if (stored) {
      try {
        setHiddenColumns(new Set(JSON.parse(stored)));
      } catch {
        /* ignore */
      }
    } else {
      setHiddenColumns(new Set());
    }
    setFilters({});
    setDateFilters({});
    setSortConfig(null);
    setDocKeyword("");
  }, [selectedFormId]);

  // 숨김 컬럼 저장
  useEffect(() => {
    if (!selectedFormId) return;
    localStorage.setItem(
      `altSheet_${selectedFormId}_hiddenColumns`,
      JSON.stringify(Array.from(hiddenColumns))
    );
  }, [hiddenColumns, selectedFormId]);

  useEffect(() => {
    if (!selectedFormId) return;
    setIsLoading(true);
    AltSheetRowAPI.RAltSheetRows({ query: { form: selectedFormId } })
      .then(({ rows: loadedRows }) => {
        setRows(loadedRows);
        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        setIsLoading(false);
      });
  }, [selectedFormId]);

  const truncatePreview = (text: string, max = 80): string => {
    const plain = text.replace(/\s+/g, " ").trim();
    if (plain.length <= max) return plain;
    return `${plain.slice(0, max)}…`;
  };

  /** CSV 내보내기용: base64 등 무거운 데이터 제거, 가독 가능한 텍스트 유지 */
  const sanitizeForCsvExport = (value: string): string => {
    let text = value;

    // 마크다운 이미지(data URI)
    text = text.replace(/!\[[^\]]*\]\(data:[^)]+\)/g, "[이미지]");
    // 마크다운 링크(data URI)
    text = text.replace(/\[[^\]]*\]\(data:[^)]+\)/g, "[첨부데이터]");
    // HTML img(data URI)
    text = text.replace(
      /<img\b[^>]*\bsrc=["']data:[^"']+["'][^>]*>/gi,
      "[이미지]"
    );
    // HTML table → 탭 구분 텍스트
    text = text.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_, tableHtml) => {
      const rows: string[] = [];
      for (const rowMatch of tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const cells: string[] = [];
        for (const cellMatch of rowMatch[1].matchAll(
          /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi
        )) {
          cells.push(
            cellMatch[1]
              .replace(/<[^>]+>/g, " ")
              .replace(/[^\S\n]+/g, " ")
              .trim()
          );
        }
        if (cells.length > 0) rows.push(cells.join("\t"));
      }
      return rows.join("\n");
    });
    // 남은 HTML 태그 제거(내용은 유지)
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/?(p|div|h[1-6]|li|blockquote)[^>]*>/gi, "\n");
    text = text.replace(/<[^>]+>/g, "");

    // 노출된 data URI blob
    text = text.replace(/data:image\/[^;,\s]+;[^,\s"')]+,[^)\s"'>]+/gi, "[이미지]");
    text = text.replace(/data:[^;,\s]+;[^,\s"')]+,[^)\s"'>]+/gi, "[첨부데이터]");

    // 같은 줄 공백 정리, 과도한 빈 줄만 축소(의도적 줄바꿈은 유지)
    text = text.replace(/[^\S\n]+/g, " ");
    text = text.replace(/\n{3,}/g, "\n\n");

    return text.trim();
  };

  const formatCellValue = (value: any, field?: TAltFormField): string => {
    if (value === null || value === undefined) return "";

    if (field?.type === "userSelect" && typeof value === "object") {
      return value.userName
        ? `${value.userName}(${value.userId || ""})`
        : "";
    }

    if (field?.type === "approval" && typeof value === "object") {
      const overall = value.overallStatus || value.status || "";
      const statusLabels: Record<string, string> = {
        pending: "대기",
        approved: "승인",
        rejected: "반려",
      };
      if (value.version === 2 && Array.isArray(value.steps)) {
        const parts = value.steps.map(
          (s: any) =>
            `${s.label}:${statusLabels[s.status] || s.status || ""}${
              s.approver?.userName ? `(${s.approver.userName})` : ""
            }`
        );
        return `${statusLabels[overall] || overall} | ${parts.join(" → ")}`;
      }
      const approverName = value.approver?.userName || "";
      return `${statusLabels[overall] || overall} (${approverName})`;
    }

    if (field?.type === "rating") {
      return value ? `${"★".repeat(Number(value))}` : "";
    }

    if (field?.type === "date" && value) {
      const d = new Date(value + "T00:00:00");
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("ko-KR", {
          year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
        });
      }
    }

    if (field?.type === "multiDate" && Array.isArray(value)) {
      const thisYear = new Date().getFullYear();
      return value
        .map((v: string) => {
          const d = new Date(v + "T00:00:00");
          if (!isNaN(d.getTime())) {
            const opts: Intl.DateTimeFormatOptions = {
              month: "2-digit", day: "2-digit", weekday: "short",
            };
            if (d.getFullYear() !== thisYear) {
              opts.year = "numeric";
            }
            return d.toLocaleDateString("ko-KR", opts);
          }
          return v;
        })
        .join(", ");
    }

    if (field?.type === "link" && typeof value === "object" && value?.url) {
      return value.title || value.ogTitle || value.url;
    }

    if (field?.type === "file" && Array.isArray(value)) {
      return value.map((f: any) => f.originalName || f.key || "").join(", ");
    }

    if (field?.type === "time" && value) {
      return value;
    }

    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "boolean") return value ? "Y" : "N";
    return String(value);
  };

  // CSV 내보내기용: 날짜/복수만 원본 유지, 나머지는 기존 화면 포맷
  const exportCellValue = (value: any, field?: TAltFormField): string => {
    if (value === null || value === undefined) return "";
    if (field?.type === "multiDate" && Array.isArray(value)) {
      return value.join(",");
    }
    if (field?.type === "date") {
      return value ? String(value) : "";
    }
    if (
      (field?.type === "multiSelect" || field?.type === "checkbox") &&
      Array.isArray(value)
    ) {
      return value.join(",");
    }
    const formatted = formatCellValue(value, field);
    if (
      field?.type === "docResponse" ||
      field?.type === "textarea" ||
      field?.type === "content"
    ) {
      return sanitizeForCsvExport(formatted);
    }
    return formatted;
  };

  const docFilterFields = useMemo(
    () =>
      allVisibleFields.map((f) => ({
        key: f._id,
        label: f.label,
        type: f.type,
      })),
    [allVisibleFields]
  );

  const docKeywordPlaceholder = useMemo(() => {
    const labels = allVisibleFields.slice(0, 3).map((f) => f.label);
    if (labels.length === 0) return "키워드 검색";
    return `키워드 검색 (${labels.join(", ")} 등)`;
  }, [allVisibleFields]);

  const clearDocFilters = () => {
    setDocKeyword("");
    setFilters({});
    setDateFilters({});
  };

  // 필터링된 행
  const filteredRows = useMemo(() => {
    let result = rows;

    // 키워드 검색 (응답자 + 모든 필드)
    const kw = docKeyword.trim().toLowerCase();
    if (kw) {
      result = result.filter((row) => {
        if ((row._respondentName || "").toLowerCase().includes(kw)) return true;
        if ((row._respondentId || "").toLowerCase().includes(kw)) return true;
        for (const field of allVisibleFields) {
          const cellValue = row.data[field._id];
          if (cellValue === null || cellValue === undefined) continue;
          if (
            String(formatCellValue(cellValue, field))
              .toLowerCase()
              .includes(kw)
          ) {
            return true;
          }
        }
        return false;
      });
    }

    // 텍스트 필터 적용
    for (const [fieldId, filterValue] of Object.entries(filters)) {
      if (!filterValue) continue;

      result = result.filter((row) => {
        const lower = filterValue.toLowerCase();

        if (fieldId === "_respondent") {
          return (
            (row._respondentName || "").toLowerCase().includes(lower) ||
            (row._respondentId || "").toLowerCase().includes(lower)
          );
        }

        const field = allVisibleFields.find((f) => f._id === fieldId);
        if (!field) return true;

        const cellValue = row.data[fieldId];
        if (cellValue === null || cellValue === undefined) return false;
        return String(formatCellValue(cellValue, field))
          .toLowerCase()
          .includes(lower);
      });
    }

    // 날짜 범위 필터 적용
    for (const [fieldId, range] of Object.entries(dateFilters)) {
      if (!range.from && !range.to) continue;

      result = result.filter((row) => {
        if (fieldId === "_submittedAt") {
          if (!row._submittedAt) return false;
          const d = new Date(row._submittedAt);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          if (range.from && dateStr < range.from) return false;
          if (range.to && dateStr > range.to) return false;
          return true;
        }

        const field = allVisibleFields.find((f) => f._id === fieldId);
        if (!field) return true;

        const cellValue = row.data[fieldId];
        if (cellValue === null || cellValue === undefined) return false;

        if (field.type === "multiDate" && Array.isArray(cellValue)) {
          return cellValue.some((v: string) => {
            if (!v) return false;
            if (range.from && v < range.from) return false;
            if (range.to && v > range.to) return false;
            return true;
          });
        }

        // date 타입
        const dateVal = String(cellValue);
        if (!dateVal) return false;
        if (range.from && dateVal < range.from) return false;
        if (range.to && dateVal > range.to) return false;
        return true;
      });
    }

    // 정렬 적용
    if (sortConfig) {
      const { fieldId, direction } = sortConfig;
      result = [...result].sort((a, b) => {
        let aVal: any;
        let bVal: any;

        if (fieldId === "_respondent") {
          aVal = a._respondentName || "";
          bVal = b._respondentName || "";
        } else if (fieldId === "_submittedAt") {
          aVal = a._submittedAt || "";
          bVal = b._submittedAt || "";
        } else if (fieldId === "_quiz_score") {
          aVal = a.data?._quiz_score ?? 0;
          bVal = b.data?._quiz_score ?? 0;
        } else {
          aVal = a.data[fieldId] ?? "";
          bVal = b.data[fieldId] ?? "";
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        const strA = String(aVal);
        const strB = String(bVal);
        return direction === "asc"
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      });
    }

    return result;
  }, [rows, docKeyword, filters, dateFilters, sortConfig, allVisibleFields]);

  // 문서 보기 index를 필터 결과에 맞게 유지
  useEffect(() => {
    if (filteredRows.length === 0) {
      setDocIndex(0);
      return;
    }
    setDocIndex((prev) => Math.min(Math.max(0, prev), filteredRows.length - 1));
  }, [filteredRows.length, rows.length, filters, dateFilters, sortConfig]);

  // 폼 변경 시 문서 index 초기화
  useEffect(() => {
    setDocIndex(0);
    setEditingRowId(null);
    setDocEditData({});
  }, [selectedFormId]);

  const currentDocRowId = filteredRows[docIndex]?._id ?? null;

  // 문서 보기에서 행·모드 전환 시 편집 모드 종료
  useEffect(() => {
    setEditingRowId(null);
    setDocEditData({});
  }, [currentDocRowId, viewMode]);

  const currentDocRow = filteredRows[docIndex] ?? null;

  const handleColumnSort = (fieldId: string) => {
    setSortConfig((prev) => {
      if (prev?.fieldId === fieldId) {
        if (prev.direction === "asc") return { fieldId, direction: "desc" };
        return null;
      }
      return { fieldId, direction: "asc" };
    });
  };

  const isFilterActive = (fieldId: string) => {
    if (filters[fieldId]) return true;
    const range = dateFilters[fieldId];
    return !!(range?.from || range?.to);
  };

  /** 잘린 셀 전체 내용 미리보기 */
  const [cellPreview, setCellPreview] = useState<{
    text: string;
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const openCellPreview = (
    el: HTMLElement,
    text: string,
    force = false
  ) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    const overflowed =
      el.scrollWidth > el.clientWidth + 1 ||
      el.scrollHeight > el.clientHeight + 1;
    if (!force && !overflowed && trimmed.length < 40) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 260), 420);
    const left = Math.min(
      rect.left,
      Math.max(8, window.innerWidth - width - 8)
    );
    setCellPreview({
      text: trimmed,
      top: rect.bottom + 4,
      left,
      width,
    });
  };

  const handleCellClick = (
    rowId: string,
    field: TAltFormField,
    currentValue: string
  ) => {
    if (!canDeleteAnyRow) return;
    // 복합 타입은 텍스트 입력으로 편집 불가 (데이터 손상 방지)
    const nonEditableTypes = [
      "multiDate", "multiSelect", "userSelect", "file", "link",
      "checkbox", "rating", "scale", "counter", "approval", "content",
    ];
    if (nonEditableTypes.includes(field.type)) return;
    setEditingCell({ rowId, fieldId: field._id });
    // date는 표시용 포맷이 아니라 YYYY-MM-DD 원본을 편집
    setEditValue(currentValue || "");
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    try {
      await AltSheetRowAPI.UAltSheetRow({
        params: { _id: editingCell.rowId },
        data: { data: { [editingCell.fieldId]: editValue } },
      });
      setRows((prev) =>
        prev.map((r) =>
          r._id === editingCell.rowId
            ? {
                ...r,
                data: { ...r.data, [editingCell.fieldId]: editValue },
              }
            : r
        )
      );
    } catch (err) {
      ALERT_ERROR(err);
    }
    setEditingCell(null);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCellSave();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  // 관리자 빈 행 추가 (Bulk API 사용 — 응답 중복 체크 우회)
  const handleAddRow = async () => {
    if (!selectedForm) return;
    try {
      const emptyData: Record<string, any> = {};
      for (const field of selectedForm.fields) {
        emptyData[field._id] = null;
      }
      const { rows: newRows } = await AltSheetRowAPI.CAltSheetRowsBulk({
        data: {
          form: selectedForm._id,
          rows: [
            {
              _respondent: currentUser?._id,
              _respondentId: currentUser?.userId,
              _respondentName: currentUser?.userName,
              data: emptyData,
            },
          ],
        },
      });
      if (newRows.length > 0) {
        setRows((prev) => [...prev, newRows[0]]);
      }
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 승인/반려 처리
  const handleApproval = async (
    rowId: string,
    fieldId: string,
    status: "approved" | "rejected"
  ) => {
    const reason = approvalReason[`${rowId}_${fieldId}`] || "";
    try {
      const { row } = await AltSheetRowAPI.UAltSheetRow({
        params: { _id: rowId },
        data: {
          data: {
            [fieldId]: {
              status,
              reason,
            },
          },
        },
      });
      setRows((prev) =>
        prev.map((r) => (r._id === rowId ? { ...r, data: row.data } : r))
      );
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 행 삭제 확인 요청
  const requestDeleteRow = (row: TAltSheetRow) => {
    setDeleteTargetRow(row);
  };

  // 행 삭제 실행
  const handleDeleteConfirm = async () => {
    if (!deleteTargetRow || isDeletingRow) return;
    const rowId = deleteTargetRow._id;
    setIsDeletingRow(true);
    try {
      await AltSheetRowAPI.DAltSheetRow({ params: { _id: rowId } });
      setRows((prev) => prev.filter((r) => r._id !== rowId));
      if (editingRowId === rowId) {
        setEditingRowId(null);
        setDocEditData({});
      }
      setDeleteTargetRow(null);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsDeletingRow(false);
    }
  };

  const csvFileRef = useRef<HTMLInputElement>(null);

  // CSV 다운로드 (BOM 포함으로 한글 Excel 호환)
  const handleCsvDownload = () => {
    if (!selectedForm || filteredRows.length === 0) return;

    const headers = ["#", "응답자"];
    for (const field of visibleFields) headers.push(field.label);
    if (isQuiz) { headers.push("점수"); headers.push("총점"); }
    headers.push("제출일");

    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const lines = [headers.map(escapeCsv).join(",")];
    for (let i = 0; i < filteredRows.length; i++) {
      const row = filteredRows[i];
      const cells: string[] = [
        String(i + 1),
        row._respondentName
          ? `${row._respondentName}(${row._respondentId || ""})`
          : "",
      ];
      for (const field of visibleFields) {
        // 메일머지/재가져오기용: 날짜·복수는 원본 값으로보냄 (화면용 포맷 금지)
        cells.push(exportCellValue(row.data[field._id], field));
      }
      if (isQuiz) {
        cells.push(row.data?._quiz_score != null ? String(row.data._quiz_score) : "");
        cells.push(row.data?._quiz_total != null ? String(row.data._quiz_total) : "");
      }
      cells.push(
        row._submittedAt
          ? new Date(row._submittedAt).toLocaleString("ko-KR", {
              year: "numeric", month: "2-digit", day: "2-digit",
              weekday: "short", hour: "2-digit", minute: "2-digit",
            })
          : ""
      );
      lines.push(cells.map(escapeCsv).join(","));
    }

    const bom = "\uFEFF";
    const blob = new Blob([bom + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedForm.title}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // CSV 업로드
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedForm) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        alert("CSV 파일에 데이터가 없습니다.");
        return;
      }

      // 헤더 파싱
      const headers = parseCsvLine(lines[0]);
      const dataRows: Record<string, any>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        const obj: Record<string, any> = {};
        for (let j = 0; j < headers.length; j++) {
          const header = headers[j].trim();
          if (header && header !== "#" && header !== "응답자" && header !== "제출일") {
            obj[header] = values[j]?.trim() ?? "";
          }
        }
        if (Object.keys(obj).length > 0) {
          dataRows.push(obj);
        }
      }

      if (dataRows.length === 0) {
        alert("가져올 데이터가 없습니다.");
        return;
      }

      try {
        const { rows: newRows, created } =
          await AltSheetRowAPI.CAltSheetRowImportCsv({
            data: { form: selectedForm._id, rows: dataRows },
          });
        setRows((prev) => [...prev, ...newRows]);
        alert(`${created}개 행을 가져왔습니다.`);
      } catch (err) {
        ALERT_ERROR(err);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  // CSV 라인 파싱 (쌍따옴표 처리)
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          result.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  };

  // 승인 필드인지 + 현재 사용자가 승인자인지 판별
  const isApproverForField = (row: TAltSheetRow, field: TAltFormField) => {
    if (field.type !== "approval") return false;
    return isCurrentApprover(
      row.data[field._id],
      currentUser?.userId,
      field
    );
  };

  // 승인 필드 셀 렌더링
  const renderApprovalCell = (row: TAltSheetRow, field: TAltFormField) => {
    const approvalData = normalizeApprovalValue(row.data[field._id], field);
    if (!approvalData) return "-";

    const status = approvalData.overallStatus || "pending";
    const isApprover = isApproverForField(row, field);
    const statusClass =
      status === "approved"
        ? style.badgeApproved
        : status === "rejected"
          ? style.badgeRejected
          : style.badgePending;
    const current = approvalData.steps[approvalData.currentStep];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {approvalData.steps.map((s, i) => (
            <span
              key={i}
              className={`${style.approvalBadge} ${
                s.status === "approved"
                  ? style.badgeApproved
                  : s.status === "rejected"
                    ? style.badgeRejected
                    : s.status === "pending"
                      ? style.badgePending
                      : style.badgeClosed
              }`}
              style={{ fontSize: "10px", padding: "1px 5px" }}
            >
              {s.label}
              {s.approver ? `·${s.approver.userName}` : ""}
            </span>
          ))}
        </div>
        <span
          className={`${style.approvalBadge} ${statusClass}`}
          style={{ fontSize: "11px", padding: "1px 6px" }}
        >
          {status === "approved"
            ? "최종 승인"
            : status === "rejected"
              ? "반려"
              : current
                ? `${current.label} 대기`
                : "대기"}
        </span>
        {isApprover && status === "pending" && (
          <div
            style={{ display: "flex", gap: "4px", flexDirection: "column" }}
          >
            <input
              className={style.cellInput}
              placeholder="사유 (선택)"
              value={approvalReason[`${row._id}_${field._id}`] || ""}
              onChange={(e) =>
                setApprovalReason((p) => ({
                  ...p,
                  [`${row._id}_${field._id}`]: e.target.value,
                }))
              }
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: "11px", minWidth: "60px" }}
            />
            <div style={{ display: "flex", gap: "2px" }}>
              <button
                className={style.approvalActionBtn}
                style={{
                  color: "var(--status-success)",
                  background: "var(--status-success-bg)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproval(row._id, field._id, "approved");
                }}
              >
                승인
              </button>
              <button
                className={style.approvalActionBtn}
                style={{
                  color: "var(--status-error)",
                  background: "var(--status-error-bg)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproval(row._id, field._id, "rejected");
                }}
              >
                반려
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 문서 뷰: 편집 불가 필드 타입 (기존 handleCellClick과 동일)
  const nonEditableTypes = [
    "multiDate", "multiSelect", "userSelect", "file", "link",
    "checkbox", "rating", "scale", "counter", "approval", "content",
  ];

  // 문서 뷰: 행 수정 가능 여부
  const canEditRowDoc = (row: TAltSheetRow) => {
    if (canDeleteAnyRow) return true;
    if (
      row._respondent === currentUser?._id &&
      (selectedForm?.settings?.allowResubmit ||
        selectedForm?.settings?.allowMultipleResponses)
    )
      return true;
    return false;
  };

  // 문서 뷰: 편집 시작
  const handleDocEditStart = (row: TAltSheetRow) => {
    setEditingRowId(row._id);
    setDocEditData({ ...row.data });
  };

  // 문서 뷰: 저장
  const handleDocEditSave = async () => {
    if (!editingRowId) return;
    try {
      // 편집 가능한 필드만 추출
      const editableData: Record<string, any> = {};
      for (const field of allVisibleFields) {
        if (!nonEditableTypes.includes(field.type)) {
          if (
            !canDeleteAnyRow &&
            field.permission === "owner"
          )
            continue;
          editableData[field._id] = docEditData[field._id];
        }
      }
      await AltSheetRowAPI.UAltSheetRow({
        params: { _id: editingRowId },
        data: { data: editableData },
      });
      setRows((prev) =>
        prev.map((r) =>
          r._id === editingRowId
            ? { ...r, data: { ...r.data, ...editableData } }
            : r
        )
      );
      setEditingRowId(null);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 문서 뷰: 필드 값 렌더링
  const renderDocFieldValue = (
    row: TAltSheetRow,
    field: TAltFormField,
    isEditing: boolean
  ) => {
    const value = isEditing ? docEditData[field._id] : row.data[field._id];
    const canEditField =
      isEditing && !nonEditableTypes.includes(field.type) &&
      (canDeleteAnyRow || field.permission === "respondent");

    // 편집 모드: 입력 필드 렌더링
    if (canEditField) {
      switch (field.type) {
        case "textarea":
          return (
            <textarea
              className={style.docViewTextarea}
              value={value ?? ""}
              onChange={(e) =>
                setDocEditData((p) => ({ ...p, [field._id]: e.target.value }))
              }
              rows={4}
            />
          );
        case "docResponse":
          return (
            <div className={style.docResponseField}>
              <MarkdownEditor
                value={value ?? ""}
                onChange={(md) =>
                  setDocEditData((p) => ({ ...p, [field._id]: md }))
                }
                placeholder="문서 응답을 편집하세요."
                minHeight="200px"
                onImageUpload={handleEditorImageUpload}
              />
            </div>
          );
        case "number":
          return (
            <input
              className={style.docViewInput}
              type="number"
              value={value ?? ""}
              onChange={(e) =>
                setDocEditData((p) => ({ ...p, [field._id]: e.target.value }))
              }
            />
          );
        case "date":
          return (
            <input
              className={style.docViewInput}
              type="date"
              value={value ?? ""}
              onChange={(e) =>
                setDocEditData((p) => ({ ...p, [field._id]: e.target.value }))
              }
            />
          );
        case "time":
          return (
            <input
              className={style.docViewInput}
              type="time"
              value={value ?? ""}
              onChange={(e) =>
                setDocEditData((p) => ({ ...p, [field._id]: e.target.value }))
              }
            />
          );
        case "select":
        case "radio":
          return (
            <select
              className={style.docViewInput}
              value={value ?? ""}
              onChange={(e) =>
                setDocEditData((p) => ({ ...p, [field._id]: e.target.value }))
              }
            >
              <option value="">선택하세요</option>
              {field.options?.map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          );
        default: // text
          return (
            <input
              className={style.docViewInput}
              value={value ?? ""}
              onChange={(e) =>
                setDocEditData((p) => ({ ...p, [field._id]: e.target.value }))
              }
            />
          );
      }
    }

    // 읽기 전용 렌더링
    if (value === null || value === undefined || value === "") {
      return <span style={{ color: "var(--text-color-2)", fontStyle: "italic" }}>—</span>;
    }

    if (field.type === "textarea") {
      return (
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}>
          {String(value)}
        </div>
      );
    }

    if (field.type === "docResponse") {
      return (
        <div className={style.contentFieldBody}>
          <MarkdownViewer content={String(value)} />
        </div>
      );
    }

    if (field.type === "file" && Array.isArray(value)) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {value.map((f: any) => (
            <span
              key={f.key}
              style={{ color: "var(--accent-1)", textDecoration: "underline", cursor: "pointer" }}
              onClick={async () => {
                try {
                  const { preSignedUrl } = await FileAPI.RSignedUrlDocument({
                    query: { key: f.key, fileName: f.originalName },
                  });
                  const anchor = document.createElement("a");
                  anchor.href = preSignedUrl;
                  anchor.download = f.originalName;
                  anchor.click();
                } catch (err) {
                  ALERT_ERROR(err);
                }
              }}
            >
              {f.originalName}
            </span>
          ))}
        </div>
      );
    }

    if (field.type === "link" && typeof value === "object" && value?.url) {
      return (
        <a
          href={value.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            gap: "10px",
            textDecoration: "none",
            color: "inherit",
            padding: "8px",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            background: "var(--bg-color-2)",
          }}
        >
          {value.ogImage && (
            <img
              src={value.ogImage}
              alt=""
              style={{
                width: "60px",
                height: "60px",
                objectFit: "cover",
                borderRadius: "4px",
                flexShrink: 0,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "var(--accent-1)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {value.title || value.ogTitle || value.url}
            </div>
            {value.ogDescription && (
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-color-2)",
                  marginTop: "2px",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {value.ogDescription}
              </div>
            )}
            <div style={{ fontSize: "11px", color: "var(--text-color-3)", marginTop: "2px" }}>
              {(() => {
                try { return new URL(value.url).hostname; } catch { return value.url; }
              })()}
            </div>
          </div>
        </a>
      );
    }

    if (field.type === "approval") {
      return renderApprovalCell(row, field);
    }

    if (field.type === "rating") {
      return <span style={{ fontSize: "18px" }}>{"★".repeat(Number(value))}</span>;
    }

    return formatCellValue(value, field);
  };

  // 응답자: shareResponses(전체 공유) 또는 showOwnResponse(본인 기록) 켜진 양식
  const availableForms = canManage
    ? forms
    : forms.filter(
        (f) => f.settings.shareResponses || f.settings.showOwnResponse
      );

  const sharedCount = availableForms.filter(
    (f) => f.settings.shareResponses
  ).length;
  const responseSum = availableForms.reduce(
    (sum, f) => sum + (f.responseCount ?? 0),
    0
  );

  if (availableForms.length === 0) {
    return (
      <div className={style.formList}>
        <section className={style.formSectionPanel}>
          <div className={style.formSectionHeaderStatic}>
            <div className={style.formSectionHeaderMain}>
              <h3 className={style.formSectionTitle}>기록</h3>
              <span className={style.formSectionCount}>0</span>
            </div>
          </div>
          <div className={style.formSectionBody}>
            <div className={style.emptyState}>
              {canManage
                ? "양식을 먼저 생성해주세요."
                : "공개된 기록이 없습니다."}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // 시트 목록 (양식 미선택 시)
  if (!selectedFormId) {
    return (
      <div className={style.formList}>
        <section className={style.formSectionPanel}>
          <div className={style.formSectionHeaderStatic}>
            <div className={style.formSectionHeaderMain}>
              <h3 className={style.formSectionTitle}>기록</h3>
              <span className={style.formSectionCount}>
                {availableForms.length}
              </span>
            </div>
            <div className={style.formSectionStats}>
              {sharedCount > 0 && (
                <span>
                  공유 <strong>{sharedCount}</strong>
                </span>
              )}
              <span>
                총 응답 <strong>{responseSum}</strong>
              </span>
            </div>
          </div>
          <div className={style.formSectionBody}>
            <div className={style.formCardList}>
              {availableForms.map((form) => (
                <div
                  key={form._id}
                  className={style.formCard}
                  title="기록 열기"
                  onClick={() => {
                    setSelectedFormId(form._id);
                    onFormSelect?.(form._id);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedFormId(form._id);
                      onFormSelect?.(form._id);
                    }
                  }}
                >
                  <div
                    className={`${style.formCardLeadIcon} ${
                      form.settings.shareResponses
                        ? style.formCardLeadIconInfo
                        : ""
                    }`}
                    aria-hidden
                  >
                    <Svg type="table" width="20px" height="20px" />
                  </div>
                  <div className={style.formCardLeft}>
                    <div className={style.formCardTitle}>{form.title}</div>
                    <div className={style.formCardMeta}>
                      <span>
                        {
                          form.fields.filter((f) => f.type !== "content")
                            .length
                        }
                        개 항목
                      </span>
                      {(form.responseCount ?? 0) > 0 && (
                        <span className={style.responseCount}>
                          {form.settings.allowMultipleResponses
                            ? `응답 ${form.responseCount}건`
                            : `제출 ${form.responseCount}명`}
                        </span>
                      )}
                      {form.settings.shareResponses && (
                        <span
                          className={style.formCardBadge}
                          style={{
                            background: "var(--status-info-bg)",
                            color: "var(--status-info)",
                          }}
                        >
                          공유
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={style.formCardRight}>
                    {onCopySheetLink && (
                      <button
                        type="button"
                        className={style.formCardIconBtn}
                        title="링크 복사"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopySheetLink(form._id);
                        }}
                      >
                        <Svg type="link" width="20px" height="20px" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  const submissionSummary = isLoading
    ? "로딩 중..."
    : (() => {
        const uniqueUsers = new Set(
          filteredRows.map((r) => r._respondent).filter(Boolean)
        ).size;
        const totalUniqueUsers = new Set(
          rows.map((r) => r._respondent).filter(Boolean)
        ).size;
        const userLabel = `${uniqueUsers}명 제출`;
        const filtered =
          filteredRows.length !== rows.length
            ? ` (전체 ${totalUniqueUsers}명)`
            : "";
        const rowExtra =
          filteredRows.length !== uniqueUsers
            ? ` · ${filteredRows.length}개 응답`
            : "";
        return userLabel + filtered + rowExtra;
      })();

  return (
    <div className={style.sheetContainer}>
      {/* 헤더: 양식 관리와 동일한 서식 */}
      <div className={style.builderHeader}>
        <div className={style.builderHeaderLeft}>
          <button
            type="button"
            className={style.backBtn}
            title="목록"
            onClick={() => {
              setSelectedFormId("");
              setRows([]);
              setFilters({});
              setDateFilters({});
              setSortConfig(null);
              setDocKeyword("");
              onFormDeselect?.();
            }}
          >
            <Svg type="chevronLeft" width="20px" height="20px" />
          </button>
          <div className={style.sheetHeaderTitleWrap}>
            <span className={style.sheetHeaderTitle}>
              {selectedForm?.title || "기록"}
            </span>
            <span className={style.sheetCount}>{submissionSummary}</span>
          </div>
        </div>
        <div className={style.builderHeaderActions}>
          <div className={style.viewModeToggle}>
            <button
              type="button"
              className={`${style.formCardIconBtn} ${
                viewMode === "table" ? style.formCardIconBtnActive : ""
              }`}
              onClick={() => setViewMode("table")}
              title="테이블 보기"
            >
              <Svg type="table" width="20px" height="20px" />
            </button>
            <button
              type="button"
              className={`${style.formCardIconBtn} ${
                viewMode === "doc" ? style.formCardIconBtnActive : ""
              }`}
              onClick={() => setViewMode("doc")}
              title="문서 보기"
            >
              <Svg type="article" width="20px" height="20px" />
            </button>
          </div>
          {onCopySheetLink && (
            <button
              type="button"
              className={style.formCardIconBtn}
              title="링크 복사"
              onClick={() => onCopySheetLink(selectedFormId)}
            >
              <Svg type="link" width="20px" height="20px" />
            </button>
          )}
          {canManage && (
            <button
              type="button"
              className={style.formCardIconBtn}
              title="행 추가"
              onClick={handleAddRow}
            >
              <Svg type="plus" width="20px" height="20px" />
            </button>
          )}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className={`${style.formCardIconBtn} ${
                showColumnSettings ? style.formCardIconBtnActive : ""
              }`}
              title="컬럼 설정"
              onClick={() => setShowColumnSettings(!showColumnSettings)}
            >
              <Svg type="list_check" width="20px" height="20px" />
            </button>
            {showColumnSettings && (
              <div className={style.columnSettingsDropdown}>
                {allVisibleFields.map((f) => (
                  <label key={f._id} className={style.columnSettingsItem}>
                    <input
                      type="checkbox"
                      checked={!hiddenColumns.has(f._id)}
                      onChange={(e) => {
                        setHiddenColumns((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) {
                            next.delete(f._id);
                          } else {
                            next.add(f._id);
                          }
                          return next;
                        });
                      }}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          {canManage && (
            <>
              <button
                type="button"
                className={style.formCardIconBtn}
                title="CSV 다운로드"
                onClick={handleCsvDownload}
              >
                <Svg type="download" width="20px" height="20px" />
              </button>
              <button
                type="button"
                className={style.formCardIconBtn}
                title="CSV 업로드"
                onClick={() => csvFileRef.current?.click()}
              >
                <Svg type="upload" width="20px" height="20px" />
              </button>
              <input
                ref={csvFileRef}
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={handleCsvUpload}
              />
            </>
          )}
        </div>
      </div>

      {/* 콘텐츠 */}
      {!isLoading && rows.length === 0 ? (
        <div className={style.sheetEmpty}>아직 응답이 없습니다.</div>
      ) : !isLoading && viewMode === "doc" ? (
        /* ── 문서 뷰 (양식형 개별 보기) ── */
        <div className={style.docViewSingle}>
          <div className={style.docViewSearch}>
            <MergeStyleFilterBar
              keyword={docKeyword}
              onKeywordChange={setDocKeyword}
              keywordPlaceholder={docKeywordPlaceholder}
              textFilters={filters}
              onTextFilterChange={(key, value) =>
                setFilters((p) => ({ ...p, [key]: value }))
              }
              dateFilters={dateFilters}
              onDateFilterChange={(key, range) =>
                setDateFilters((p) => ({ ...p, [key]: range }))
              }
              fields={docFilterFields}
              respondentFilterKey="_respondent"
              onClear={clearDocFilters}
            />
          </div>

          {filteredRows.length === 0 || !currentDocRow ? (
            <div className={style.sheetEmpty}>표시할 응답이 없습니다.</div>
          ) : (
            <>
              <div className={style.reviewNav}>
                <button
                  type="button"
                  className={style.reviewNavBtn}
                  disabled={docIndex <= 0}
                  onClick={() => setDocIndex((i) => Math.max(0, i - 1))}
                  title="이전 응답"
                >
                  <Svg type="chevronLeft" width="18px" height="18px" />
                </button>
                <span className={style.reviewNavCount}>
                  {docIndex + 1} / {filteredRows.length}
                </span>
                <button
                  type="button"
                  className={style.reviewNavBtn}
                  disabled={docIndex >= filteredRows.length - 1}
                  onClick={() =>
                    setDocIndex((i) =>
                      Math.min(filteredRows.length - 1, i + 1)
                    )
                  }
                  title="다음 응답"
                >
                  <Svg type="chevronRight" width="18px" height="18px" />
                </button>
              </div>

              <div className={style.docViewCardHeader}>
                <div>
                  <span style={{ fontWeight: 600 }}>
                    {currentDocRow._respondentName || "응답자"}
                  </span>
                  {currentDocRow._respondentId && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text-color-2)",
                        marginLeft: "4px",
                      }}
                    >
                      ({currentDocRow._respondentId})
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--text-color-2)",
                    }}
                  >
                    {currentDocRow._submittedAt
                      ? new Date(currentDocRow._submittedAt).toLocaleString(
                          "ko-KR",
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            weekday: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : "-"}
                  </span>
                  {canEditRowDoc(currentDocRow) &&
                    editingRowId !== currentDocRow._id && (
                      <button
                        type="button"
                        className={style.formCardIconBtn}
                        title="수정"
                        onClick={() => handleDocEditStart(currentDocRow)}
                      >
                        <Svg type="edit" width="18px" height="18px" />
                      </button>
                    )}
                  {editingRowId === currentDocRow._id && (
                    <>
                      <Button
                        type="ghost"
                        onClick={handleDocEditSave}
                        style={{ padding: "2px 8px", fontSize: "12px" }}
                      >
                        저장
                      </Button>
                      <Button
                        type="ghost"
                        onClick={() => setEditingRowId(null)}
                        style={{ padding: "2px 8px", fontSize: "12px" }}
                      >
                        취소
                      </Button>
                    </>
                  )}
                  {(canDeleteAnyRow ||
                    (currentDocRow._respondent === currentUser?._id &&
                      (selectedForm?.settings?.allowResubmit ||
                        selectedForm?.settings?.allowMultipleResponses))) && (
                    <button
                      className={style.removeBtn}
                      onClick={() => requestDeleteRow(currentDocRow)}
                      title="삭제"
                      style={{ opacity: 0.5 }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {isQuiz && currentDocRow.data?._quiz_score != null && (
                <div className={style.quizScoreBanner}>
                  <div className={style.quizScoreText}>
                    <strong>
                      점수: {currentDocRow.data._quiz_score} /{" "}
                      {currentDocRow.data._quiz_total || 0}점
                    </strong>
                  </div>
                </div>
              )}

              {visibleFields.map((field) => (
                <div key={field._id} className={style.questionItem}>
                  <div className={style.questionLabel}>
                    <span className={style.questionLabelText}>
                      {field.label}
                    </span>
                    {field.required && (
                      <span className={style.requiredMark}>*</span>
                    )}
                    {field.permission === "owner" && (
                      <span className={style.docViewOwnerBadge}>(관리자)</span>
                    )}
                  </div>
                  <div className={style.docViewValue}>
                    {renderDocFieldValue(
                      currentDocRow,
                      field,
                      editingRowId === currentDocRow._id
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      ) : !isLoading ? (
        /* ── 테이블 뷰 ── */
        <div className={style.sheetTableWrap}>
          <table className={style.sheetTable}>
            <colgroup>
              <col className={style.colRowNum} />
              <col className={style.colRespondent} />
              {visibleFields.map((f) => (
                <col
                  key={f._id}
                  className={
                    f.type === "multiDate" ||
                    f.type === "textarea" ||
                    f.type === "docResponse"
                      ? style.colWide
                      : style.colField
                  }
                />
              ))}
              {isQuiz && <col className={style.colQuiz} />}
              <col className={style.colSubmitted} />
              <col className={style.colAction} />
            </colgroup>
            <thead>
              <tr>
                <th className={style.rowNumCell}>#</th>
                    <SheetColHeader
                      fieldId="_respondent"
                      label="응답자"
                      sortConfig={sortConfig}
                      onSortCycle={handleColumnSort}
                      hasActiveFilter={isFilterActive("_respondent")}
                    >
                      <input
                        className={style.filterInput}
                        placeholder="검색..."
                        value={filters["_respondent"] || ""}
                        onChange={(e) =>
                          setFilters((p) => ({
                            ...p,
                            _respondent: e.target.value,
                          }))
                        }
                      />
                    </SheetColHeader>
                    {visibleFields.map((f) => (
                      <SheetColHeader
                        key={f._id}
                        fieldId={f._id}
                        label={
                          <>
                            {f.label}
                            {f.permission === "owner" && (
                              <span className={style.sheetColOwnerBadge}>
                                (관리자)
                              </span>
                            )}
                          </>
                        }
                        sortConfig={sortConfig}
                        onSortCycle={handleColumnSort}
                        hasActiveFilter={isFilterActive(f._id)}
                      >
                        {f.type === "select" || f.type === "radio" ? (
                          <select
                            className={style.filterInput}
                            value={filters[f._id] || ""}
                            onChange={(e) =>
                              setFilters((p) => ({
                                ...p,
                                [f._id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">전체</option>
                            {f.options?.map((opt, i) => (
                              <option key={i} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : f.type === "checkbox" ? (
                          <select
                            className={style.filterInput}
                            value={filters[f._id] || ""}
                            onChange={(e) =>
                              setFilters((p) => ({
                                ...p,
                                [f._id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">전체</option>
                            <option value="Y">Y</option>
                            <option value="N">N</option>
                          </select>
                        ) : f.type === "approval" ? (
                          <select
                            className={style.filterInput}
                            value={filters[f._id] || ""}
                            onChange={(e) =>
                              setFilters((p) => ({
                                ...p,
                                [f._id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">전체</option>
                            <option value="대기">대기</option>
                            <option value="승인">승인</option>
                            <option value="반려">반려</option>
                          </select>
                        ) : f.type === "date" || f.type === "multiDate" ? (
                          <DateRangeFilterDropdown
                            compact
                            value={dateFilters[f._id] || { from: "", to: "" }}
                            onChange={(range) =>
                              setDateFilters((p) => ({ ...p, [f._id]: range }))
                            }
                            placeholder="날짜 필터"
                          />
                        ) : (
                          <input
                            className={style.filterInput}
                            placeholder="검색..."
                            value={filters[f._id] || ""}
                            onChange={(e) =>
                              setFilters((p) => ({
                                ...p,
                                [f._id]: e.target.value,
                              }))
                            }
                          />
                        )}
                      </SheetColHeader>
                    ))}
                    {isQuiz && (
                      <SheetColHeader
                        fieldId="_quiz_score"
                        label="점수"
                        sortConfig={sortConfig}
                        onSortCycle={handleColumnSort}
                        hasActiveFilter={false}
                      >
                        <span className={style.sheetColMenuHint}>
                          점수 열은 필터를 지원하지 않습니다.
                        </span>
                      </SheetColHeader>
                    )}
                    <SheetColHeader
                      fieldId="_submittedAt"
                      label="제출일"
                      sortConfig={sortConfig}
                      onSortCycle={handleColumnSort}
                      hasActiveFilter={isFilterActive("_submittedAt")}
                    >
                      <DateRangeFilterDropdown
                        compact
                        value={
                          dateFilters["_submittedAt"] || { from: "", to: "" }
                        }
                        onChange={(range) =>
                          setDateFilters((p) => ({
                            ...p,
                            _submittedAt: range,
                          }))
                        }
                        placeholder="날짜 필터"
                      />
                    </SheetColHeader>
                <th className={style.actionCell} />
              </tr>
            </thead>
            <tbody>
            {filteredRows.map((row, index) => (
              <tr key={row._id}>
                <td className={style.rowNumCell}>{index + 1}</td>
                <td
                  className={style.cellPreviewable}
                  onClick={(e) => {
                    const name = row._respondentName || "";
                    const id = row._respondentId
                      ? ` (${row._respondentId})`
                      : "";
                    openCellPreview(
                      e.currentTarget,
                      `${name}${id}`.trim()
                    );
                  }}
                >
                  {row._respondentName || ""}
                  {row._respondentId && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text-color-2)",
                        marginLeft: "4px",
                      }}
                    >
                      ({row._respondentId})
                    </span>
                  )}
                </td>
                {visibleFields.map((field) => {
                  // 파일 필드 특별 렌더링
                  if (
                    field.type === "file" &&
                    Array.isArray(row.data[field._id])
                  ) {
                    return (
                      <td key={field._id}>
                        {(
                          row.data[field._id] as {
                            originalName: string;
                            key: string;
                          }[]
                        ).map((f) => (
                          <span
                            key={f.key}
                            style={{
                              color: "var(--accent-1)",
                              textDecoration: "underline",
                              cursor: "pointer",
                              marginRight: "8px",
                            }}
                            onClick={async () => {
                              try {
                                const { preSignedUrl } =
                                  await FileAPI.RSignedUrlDocument({
                                    query: {
                                      key: f.key,
                                      fileName: f.originalName,
                                    },
                                  });
                                const anchor = document.createElement("a");
                                anchor.href = preSignedUrl;
                                anchor.download = f.originalName;
                                anchor.click();
                              } catch (err) {
                                ALERT_ERROR(err);
                              }
                            }}
                          >
                            {f.originalName}
                          </span>
                        ))}
                      </td>
                    );
                  }

                  // 승인 필드 특별 렌더링
                  if (field.type === "approval") {
                    return (
                      <td key={field._id}>
                        {renderApprovalCell(row, field)}
                      </td>
                    );
                  }

                  const rawValue = row.data[field._id];
                  const cellValue = formatCellValue(rawValue, field);
                  const displayValue =
                    field.type === "docResponse" && cellValue
                      ? truncatePreview(cellValue)
                      : cellValue;
                  const isEditing =
                    editingCell?.rowId === row._id &&
                    editingCell?.fieldId === field._id;
                  const canEdit = canDeleteAnyRow;
                  const editSource =
                    field.type === "docResponse" || field.type === "date"
                      ? String(rawValue ?? "")
                      : cellValue;

                  const nonEditableTypes = [
                    "multiDate",
                    "multiSelect",
                    "userSelect",
                    "file",
                    "link",
                    "checkbox",
                    "rating",
                    "scale",
                    "counter",
                    "approval",
                    "content",
                  ];
                  const canInlineEdit =
                    canEdit && !nonEditableTypes.includes(field.type);

                  return (
                    <td
                      key={field._id}
                      onClick={(e) => {
                        if (isEditing) return;
                        if (canInlineEdit) {
                          handleCellClick(row._id, field, editSource);
                          return;
                        }
                        openCellPreview(
                          e.currentTarget,
                          cellValue,
                          field.type === "textarea" ||
                            field.type === "docResponse" ||
                            field.type === "multiDate"
                        );
                      }}
                      className={[
                        canInlineEdit ? style.cellEditable : "",
                        style.cellPreviewable,
                        field.type === "textarea" || field.type === "docResponse"
                          ? style.cellTextarea
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined}
                      title={cellValue || undefined}
                    >
                      {isEditing ? (
                        field.type === "textarea" ||
                        field.type === "docResponse" ? (
                          <textarea
                            className={style.cellInput}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellSave}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            autoFocus
                            rows={4}
                            style={{ resize: "vertical", minHeight: "60px" }}
                          />
                        ) : (
                          <input
                            className={style.cellInput}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellSave}
                            onKeyDown={handleCellKeyDown}
                            autoFocus
                          />
                        )
                      ) : (
                        displayValue || ""
                      )}
                    </td>
                  );
                })}
                {isQuiz && (
                  <td>
                    {row.data?._quiz_score != null
                      ? `${row.data._quiz_score} / ${row.data._quiz_total || 0}`
                      : "-"}
                  </td>
                )}
                <td>
                  {row._submittedAt
                    ? new Date(row._submittedAt).toLocaleString("ko-KR", {
                        year: "numeric", month: "2-digit", day: "2-digit",
                        weekday: "short", hour: "2-digit", minute: "2-digit",
                      })
                    : "-"}
                </td>
                <td className={style.actionCell}>
                  {(canDeleteAnyRow ||
                    (row._respondent === currentUser?._id &&
                      (selectedForm?.settings?.allowResubmit ||
                        selectedForm?.settings?.allowMultipleResponses))) && (
                    <button
                      className={style.removeBtn}
                      onClick={() => requestDeleteRow(row)}
                      title="삭제"
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {cellPreview && (
        <div
          className={style.cellPreviewOverlay}
          onClick={() => setCellPreview(null)}
        >
          <div
            className={style.cellPreviewPop}
            style={{
              top: cellPreview.top,
              left: cellPreview.left,
              width: cellPreview.width,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={style.cellPreviewText}>{cellPreview.text}</div>
            <button
              type="button"
              className={style.cellPreviewClose}
              onClick={() => setCellPreview(null)}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {deleteTargetRow && (
        <Popup
          title="응답 삭제"
          setState={(v: boolean) => {
            if (!v && !isDeletingRow) setDeleteTargetRow(null);
          }}
          closeBtn={!isDeletingRow}
          style={{ maxWidth: "420px", width: "100%" }}
          footer={
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <Button
                type="ghost"
                onClick={() => setDeleteTargetRow(null)}
                disabled={isDeletingRow}
              >
                취소
              </Button>
              <Button
                type="ghost"
                onClick={handleDeleteConfirm}
                disabled={isDeletingRow}
                style={{ color: "var(--status-error)" }}
              >
                {isDeletingRow ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          }
        >
          <div style={{ padding: "8px 4px", lineHeight: 1.6 }}>
            <strong>{deleteTargetRow._respondentName || "응답자"}</strong>
            님의 응답을 삭제하시겠습니까?
            <br />
            이 작업은 되돌릴 수 없습니다.
          </div>
        </Popup>
      )}
    </div>
  );
};

export default AltSheetView;
