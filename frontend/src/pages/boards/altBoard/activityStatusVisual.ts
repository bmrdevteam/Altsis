import { TAltForm } from "types/altForm";

export type TActivityPeriodKind = "open" | "scheduled" | "closed";

type TActivityStatusKey =
  | "draft"
  | "direct"
  | "closed"
  | "scheduled"
  | "submitted"
  | "openRequired"
  | "openOptional";

/** 카드 리드 배경 톤 */
export type TActivityLeadTone =
  | "draft"
  | "pending"
  | "submitted"
  | "closed"
  | "scheduled"
  | "info"
  | "warning";

/** 텍스트 뱃지 종류 */
export type TActivityBadgeKind =
  | "draft"
  | "direct"
  | "closed"
  | "scheduled"
  | "submitted"
  | "pending"
  | "optional";

export type TActivityStatusVisual = {
  icon: string;
  leadTone: TActivityLeadTone;
  badgeKind: TActivityBadgeKind;
};

/** 필터 칩용 (전체·할 일·상태) */
export type TActivityChipKey =
  | "all"
  | "todo"
  | "open"
  | "submitted"
  | "closed"
  | "scheduled"
  | "draft"
  | "direct";

export type TActivityChipVisual = {
  icon: string;
  /** boards.module.scss filterChipTone* 접미사 */
  tone: string;
  label: string;
};

export const getActivityPeriodKind = (
  form: TAltForm
): TActivityPeriodKind => {
  const now = new Date();
  if (form.settings.closeAt && new Date(form.settings.closeAt) < now) {
    return "closed";
  }
  if (form.settings.openAt && new Date(form.settings.openAt) > now) {
    return "scheduled";
  }
  return "open";
};

/** 필수+복수일 때 목표 제출 횟수. 해당 아니면 null */
export const getRequiredResponseCount = (
  form: TAltForm | null | undefined
): number | null => {
  if (!form) return null;
  if (form.settings?.requiredMode !== true) return null;
  if (!form.settings?.allowMultipleResponses) return null;
  const n = Number(form.settings.requiredResponseCount);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
};

const getActivityStatusKey = (form: TAltForm): TActivityStatusKey => {
  if (form.isDraft) return "draft";
  if (form.settings.directInputMode) return "direct";
  const period = getActivityPeriodKind(form);
  if (period === "closed") return "closed";
  if (period === "scheduled") return "scheduled";
  if (form.mySubmitted) return "submitted";
  if (form.myRespondent === false) return "openOptional";
  if (form.settings?.requiredMode === true) return "openRequired";
  return "openOptional";
};

/**
 * 칩·카드 리드·뱃지가 공유하는 상태 시각 맵
 * - warning: 결재(할 일)·직접입력 (아이콘으로 구분)
 * - error/pending: 필수·미제출만
 * - draft: 비공개 중립
 */
export const ACTIVITY_STATUS_VISUAL: Record<
  TActivityStatusKey,
  TActivityStatusVisual
> = {
  draft: { icon: "settings", leadTone: "draft", badgeKind: "draft" },
  direct: { icon: "table", leadTone: "warning", badgeKind: "direct" },
  closed: { icon: "archive", leadTone: "closed", badgeKind: "closed" },
  scheduled: {
    icon: "calender",
    leadTone: "scheduled",
    badgeKind: "scheduled",
  },
  submitted: {
    icon: "checkboxChecked",
    leadTone: "submitted",
    badgeKind: "submitted",
  },
  openRequired: { icon: "time", leadTone: "pending", badgeKind: "pending" },
  openOptional: { icon: "time", leadTone: "info", badgeKind: "optional" },
};

export const ACTIVITY_CHIP_VISUAL: Record<
  TActivityChipKey,
  TActivityChipVisual
> = {
  all: { icon: "list", tone: "All", label: "전체" },
  todo: { icon: "list_check", tone: "Approval", label: "할 일" },
  // 진행중 칩: info (선택·필수 묶음). 필수 강조는 카드 뱃지「필수」에 맡김
  open: { icon: "time", tone: "Optional", label: "진행중" },
  submitted: {
    icon: "checkboxChecked",
    tone: "Submitted",
    label: "제출완료",
  },
  closed: { icon: "archive", tone: "Closed", label: "마감" },
  scheduled: { icon: "calender", tone: "Scheduled", label: "예정" },
  draft: { icon: "settings", tone: "Draft", label: "비공개" },
  direct: { icon: "table", tone: "Direct", label: "직접입력" },
};

export const getActivityStatusVisual = (
  form: TAltForm
): TActivityStatusVisual => ACTIVITY_STATUS_VISUAL[getActivityStatusKey(form)];

export const getActivityBadgeLabel = (form: TAltForm): string => {
  const key = getActivityStatusKey(form);
  switch (key) {
    case "draft":
      return "비공개";
    case "direct":
      return "직접입력";
    case "closed":
      return "마감";
    case "scheduled":
      return "예정";
    case "submitted":
      if (form.settings?.allowMultipleResponses) {
        const mine = form.myResponseCount ?? 0;
        const target = getRequiredResponseCount(form);
        if (target != null) return `제출 ${mine}/${target}`;
        return `제출 ${mine}`;
      }
      return "제출완료";
    case "openOptional":
      if (form.myRespondent === false) return "";
      return "선택";
    case "openRequired": {
      const target = getRequiredResponseCount(form);
      const mine = form.myResponseCount ?? 0;
      if (target != null) return `필수 ${mine}/${target}`;
      return "미제출";
    }
    default:
      return "";
  }
};
