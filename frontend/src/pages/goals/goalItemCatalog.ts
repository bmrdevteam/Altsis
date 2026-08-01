/**
 * 학교 관리·목표 페이지가 공유하는 개별 항목 카탈로그
 */

import {
  getGoalItemTarget,
  isGoalItemPrefEnabled,
  TGoalDisplayItems,
} from "types/goals";

export { getGoalItemTarget, isGoalItemPrefEnabled };

type TSummaryLike = {
  id?: string;
  label: string;
  value: string;
  warning?: boolean;
  current?: number;
  total?: number;
};

export type TGoalItemDef = {
  id: string;
  label: string;
  /** 관리 탭에서 목표 숫자 입력 가능 */
  allowTarget?: boolean;
};

export type TGoalSectionDef = {
  key: string;
  title: string;
  items: TGoalItemDef[];
};

/** @deprecated 레거시 그룹 키 — 개별 항목 미설정 시 fallback */
export const EVAL_GROUP_ID = {
  enrolled: "enrolled:__evaluations__",
  mentoring: "mentoring:__evaluations__",
} as const;

/** @deprecated */
export const BOARD_UNSUBMITTED_GROUP_ID = "board:__unsubmitted_by_form__";

export function evaluationItemId(
  section: "enrolled" | "mentoring",
  label: string
) {
  return `${section}:eval:${label}`;
}

export function boardFormItemId(formId: string) {
  return `board:form:${formId}`;
}

const ENROLLED_BASE: TGoalItemDef[] = [
  { id: "enrolled:수강 과목", label: "수강 과목", allowTarget: true },
  { id: "enrolled:총 학점", label: "총 학점", allowTarget: true },
  { id: "enrolled:최대", label: "최대", allowTarget: false },
  { id: "enrolled:최소", label: "최소", allowTarget: false },
  { id: "enrolled:주간 수업 시수", label: "주간 수업 시수", allowTarget: true },
];

const CREATED_STATIC: TGoalItemDef[] = [
  { id: "created:개설 수업", label: "개설 수업", allowTarget: true },
  { id: "created:총 학점", label: "총 학점", allowTarget: true },
  { id: "created:총 수강생", label: "총 수강생", allowTarget: true },
  { id: "created:총 정원", label: "총 정원", allowTarget: true },
  { id: "created:승인 완료", label: "승인 완료", allowTarget: false },
];

const MENTORING_BASE: TGoalItemDef[] = [
  { id: "mentoring:담당 수업", label: "담당 수업", allowTarget: true },
  { id: "mentoring:총 학점", label: "총 학점", allowTarget: true },
  { id: "mentoring:총 수강생", label: "총 수강생", allowTarget: true },
  { id: "mentoring:총 정원", label: "총 정원", allowTarget: true },
  { id: "mentoring:승인 완료", label: "승인 완료", allowTarget: false },
];

const ENROLLED_STATIC_LABELS = new Set(ENROLLED_BASE.map((i) => i.label));
const MENTORING_STATIC_LABELS = new Set(MENTORING_BASE.map((i) => i.label));

export function archiveItemId(label: string) {
  return `archive:${label}`;
}

export type TGoalCatalogOptions = {
  formArchive?: {
    label: string;
    authStudent?: string;
    dataType?: string;
  }[];
  /** 학기 formEvaluation label 목록 (중복 제거) */
  evaluationLabels?: string[];
  /** 학교 alt 양식 목록 */
  boardForms?: { formId: string; title: string }[];
};

function evaluationItems(
  section: "enrolled" | "mentoring",
  labels: string[]
): TGoalItemDef[] {
  // 평가는 이미 n/n(제출/전체)이라 학교 목표 숫자 입력 불필요
  return labels.map((label) => ({
    id: evaluationItemId(section, label),
    label,
    allowTarget: false,
  }));
}

function boardFormItems(
  forms: { formId: string; title: string }[]
): TGoalItemDef[] {
  // 양식도 제출수/목표수 n/n이라 학교 목표 숫자 입력 불필요
  return forms.map((f) => ({
    id: boardFormItemId(f.formId),
    label: f.title || "양식",
    allowTarget: false,
  }));
}

function archiveItems(
  formArchive: {
    label: string;
    authStudent?: string;
    dataType?: string;
  }[] = []
): TGoalItemDef[] {
  return (formArchive || [])
    .filter((f) => f.authStudent && f.authStudent !== "undefined")
    .map((f) => ({
      id: archiveItemId(f.label),
      label: f.label,
      // object형은 이미 0/1 fill이라 목표 숫자 입력 불필요
      allowTarget: f.dataType === "array",
    }));
}

export function buildStudentSections(
  opts: TGoalCatalogOptions | { label: string; authStudent?: string }[] = {}
): TGoalSectionDef[] {
  // 하위 호환: 예전엔 formArchive 배열만 넘김
  const options: TGoalCatalogOptions = Array.isArray(opts)
    ? { formArchive: opts }
    : opts;
  const evalLabels = options.evaluationLabels || [];
  const forms = options.boardForms || [];

  return [
    {
      key: "enrolled",
      title: "수강 현황",
      items: [
        ...ENROLLED_BASE,
        ...evaluationItems("enrolled", evalLabels),
      ],
    },
    {
      key: "archive",
      title: "기록",
      items: archiveItems(options.formArchive),
    },
    {
      key: "board",
      title: "보드",
      items: [
        { id: "board:전체 할 일", label: "전체 할 일", allowTarget: false },
        ...boardFormItems(forms),
      ],
    },
  ];
}

export function buildTeacherSections(
  opts: TGoalCatalogOptions | { label: string; authStudent?: string }[] = {}
): TGoalSectionDef[] {
  const options: TGoalCatalogOptions = Array.isArray(opts)
    ? { formArchive: opts }
    : opts;
  const evalLabels = options.evaluationLabels || [];
  const forms = options.boardForms || [];

  return [
    {
      key: "enrolled",
      title: "수강 현황",
      items: [
        ...ENROLLED_BASE,
        ...evaluationItems("enrolled", evalLabels),
      ],
    },
    { key: "created", title: "개설 수업", items: CREATED_STATIC },
    {
      key: "mentoring",
      title: "담당 수업",
      items: [
        ...MENTORING_BASE,
        ...evaluationItems("mentoring", evalLabels),
      ],
    },
    {
      key: "archive",
      title: "기록",
      items: archiveItems(options.formArchive),
    },
    {
      key: "board",
      title: "보드",
      items: [
        { id: "board:전체 할 일", label: "전체 할 일", allowTarget: false },
        ...boardFormItems(forms),
      ],
    },
  ];
}

type DisplayLike = {
  enrolled?: boolean;
  created?: boolean;
  mentoring?: boolean;
  archive?: boolean;
  board?: boolean;
  items?: TGoalDisplayItems;
};

export function isSectionEnabled(
  display: DisplayLike | null | undefined,
  sectionKey: string
): boolean {
  if (!display) return true;
  const v = (display as Record<string, unknown>)[sectionKey];
  return v !== false;
}

function hasItemKey(items: TGoalDisplayItems | undefined, id: string) {
  return !!items && Object.prototype.hasOwnProperty.call(items, id);
}

export function isGoalItemAllowed(
  display: DisplayLike | null | undefined,
  sectionKey: string,
  item: { id?: string; label: string }
): boolean {
  if (!isSectionEnabled(display, sectionKey)) return false;

  const items = display?.items;
  const label = item.label;
  const id = item.id || `${sectionKey}:${label}`;

  // 평가 항목 (eval: id 또는 정적 라벨이 아닌 경우; 레거시 id도 허용)
  if (
    sectionKey === "enrolled" &&
    (id.startsWith("enrolled:eval:") || !ENROLLED_STATIC_LABELS.has(label))
  ) {
    const legacyId = `enrolled:${label}`;
    if (hasItemKey(items, id)) return isGoalItemPrefEnabled(items, id);
    if (id !== legacyId && hasItemKey(items, legacyId)) {
      return isGoalItemPrefEnabled(items, legacyId);
    }
    return isGoalItemPrefEnabled(items, EVAL_GROUP_ID.enrolled);
  }
  if (
    sectionKey === "mentoring" &&
    (id.startsWith("mentoring:eval:") || !MENTORING_STATIC_LABELS.has(label))
  ) {
    const legacyId = `mentoring:${label}`;
    if (hasItemKey(items, id)) return isGoalItemPrefEnabled(items, id);
    if (id !== legacyId && hasItemKey(items, legacyId)) {
      return isGoalItemPrefEnabled(items, legacyId);
    }
    return isGoalItemPrefEnabled(items, EVAL_GROUP_ID.mentoring);
  }

  // 보드 양식별 미제출
  if (sectionKey === "board" && label !== "전체 할 일") {
    if (hasItemKey(items, id)) return isGoalItemPrefEnabled(items, id);
    // title 기반 id fallback
    const byTitle = `board:${label}`;
    if (hasItemKey(items, byTitle)) {
      return isGoalItemPrefEnabled(items, byTitle);
    }
    return isGoalItemPrefEnabled(items, BOARD_UNSUBMITTED_GROUP_ID);
  }

  return isGoalItemPrefEnabled(items, id);
}

export function filterSummaryItems<T extends { id?: string; label: string }>(
  display: DisplayLike | null | undefined,
  sectionKey: string,
  items: T[]
): T[] {
  return items.filter((item) => isGoalItemAllowed(display, sectionKey, item));
}

export function parseSummaryCurrent(item: {
  current?: number;
  value: string;
}): number {
  if (item.current != null && Number.isFinite(item.current)) {
    return item.current;
  }
  const m = String(item.value).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

export function applyGoalTargets<T extends TSummaryLike>(
  display: DisplayLike | null | undefined,
  items: T[]
): T[] {
  const prefs = display?.items;
  if (!prefs) return items;

  return items.map((item) => {
    if (!item.id) return item;
    if (item.total != null && item.total > 0 && item.current != null) {
      return item;
    }
    const target = getGoalItemTarget(prefs, item.id);
    if (target == null) return item;

    const current = parseSummaryCurrent(item);
    return {
      ...item,
      current,
      total: target,
      value: `${current}/${target}`,
    };
  });
}

export function filterAndApplyTargets<T extends TSummaryLike>(
  display: DisplayLike | null | undefined,
  sectionKey: string,
  items: T[]
): T[] {
  return applyGoalTargets(
    display,
    filterSummaryItems(display, sectionKey, items)
  );
}
