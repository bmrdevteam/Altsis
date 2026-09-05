import { TAltFormField } from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import {
  isCurrentApprover,
  normalizeApprovalValue,
  TApprovalValueV2,
} from "utils/approvalLine";
import { formatReadableValue } from "./formFieldDisplay";

export type TApprovalInboxFilter =
  | "mine"
  | "pending"
  | "approved"
  | "rejected"
  | "mineSubmitted"
  | "all";

export type TApprovalListSort = "submittedDesc" | "waitingDesc" | "stepAsc";

export type TApprovalListItem = {
  rowId: string;
  fieldId: string;
  field: TAltFormField;
  row: TAltSheetRow;
  approval: TApprovalValueV2 | null;
  title: string;
  respondentName: string;
  respondentId?: string;
  status: "pending" | "approved" | "rejected" | "";
  stepLabel?: string;
  currentApproverName?: string;
  currentApproverId?: string;
  currentStep: number;
  totalSteps: number;
  waitingSince?: string;
  waitingDays: number;
  submittedAt?: string;
  isMyTurn: boolean;
  isMineSubmitted: boolean;
};

const TITLE_FIELD_TYPES = new Set(["text", "textarea", "select"]);

type TitleFieldLike = {
  _id: string;
  label?: string;
  type: string;
};

const fieldTextValue = (value: unknown): string =>
  formatReadableValue(value).replace(/\s+/g, " ").trim();

/** 결재 보기 문서 제목: 「제목」칸 → 첫 단답/장문/선택. 없으면 빈 문자열. */
export function approvalRowFieldTitle(
  data: Record<string, unknown> | undefined,
  fields: TitleFieldLike[] | undefined
): string {
  const candidates = (fields || []).filter(
    (f) =>
      f.type !== "approval" &&
      f.type !== "circulation" &&
      f.type !== "content"
  );
  const titled = candidates.find((f) => (f.label || "").trim() === "제목");
  if (titled) {
    const text = fieldTextValue(data?.[String(titled._id)]);
    if (text) return text;
  }
  const firstText = candidates.find((f) => TITLE_FIELD_TYPES.has(f.type));
  if (firstText) {
    const text = fieldTextValue(data?.[String(firstText._id)]);
    if (text) return text;
  }
  return "";
}

/** 활동 양식 제목 뒤에 결재 보기와 같은 문서 제목을 붙인다. */
export function composeApprovalCardTitle(
  formTitle: string | undefined,
  data: Record<string, unknown> | undefined,
  fields: TitleFieldLike[] | undefined
): string {
  const form = (formTitle || "").trim();
  const doc = approvalRowFieldTitle(data, fields);
  if (!doc || doc === form) return form;
  if (!form) return doc;
  return `${form} · ${doc}`;
}

export function pickApprovalField(
  fields: TAltFormField[] | undefined,
  row: TAltSheetRow,
  currentUserId?: string
): TAltFormField | undefined {
  const approvalFields = (fields || []).filter((f) => f.type === "approval");
  if (approvalFields.length === 0) return undefined;
  if (currentUserId) {
    const mine = approvalFields.find((f) =>
      isCurrentApprover(row.data?.[f._id], currentUserId, f)
    );
    if (mine) return mine;
  }
  return approvalFields[0];
}

export function approvalRowTitle(
  row: TAltSheetRow,
  fields: TAltFormField[] | undefined
): string {
  return (
    approvalRowFieldTitle(row.data, fields) ||
    row._respondentName ||
    row._respondentId ||
    "제목 없음"
  );
}

export function waitingSinceIso(
  approval: TApprovalValueV2 | null | undefined,
  submittedAt?: string
): string | undefined {
  if (approval) {
    const idx = approval.currentStep ?? 0;
    if (idx > 0) {
      const prevActedAt = approval.steps?.[idx - 1]?.actedAt;
      if (prevActedAt) return prevActedAt;
    }
  }
  return submittedAt || undefined;
}

export function waitingDaysFrom(
  waitingSince?: string,
  now: Date = new Date()
): number {
  if (!waitingSince) return 0;
  const start = new Date(waitingSince);
  if (Number.isNaN(start.getTime())) return 0;
  const ms = now.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function buildApprovalListItem(
  row: TAltSheetRow,
  fields: TAltFormField[] | undefined,
  currentUserId?: string,
  currentUserOid?: string,
  now?: Date
): TApprovalListItem | null {
  const field = pickApprovalField(fields, row, currentUserId);
  if (!field) return null;
  const raw = row.data?.[field._id];
  const approval = normalizeApprovalValue(raw, field);
  const status = (approval?.overallStatus || "") as TApprovalListItem["status"];
  const step = approval?.steps?.[approval.currentStep];
  const waitingSince = waitingSinceIso(approval, row._submittedAt);
  return {
    rowId: String(row._id),
    fieldId: String(field._id),
    field,
    row,
    approval,
    title: approvalRowTitle(row, fields),
    respondentName: row._respondentName || "",
    respondentId: row._respondentId,
    status,
    stepLabel: step?.label,
    currentApproverName: step?.approver?.userName,
    currentApproverId: step?.approver?.userId,
    currentStep:
      typeof approval?.currentStep === "number" ? approval.currentStep : 0,
    totalSteps: approval?.steps?.length || 0,
    waitingSince,
    waitingDays: waitingDaysFrom(waitingSince, now),
    submittedAt: row._submittedAt,
    isMyTurn: isCurrentApprover(raw, currentUserId, field),
    isMineSubmitted:
      (!!currentUserOid && String(row._respondent) === String(currentUserOid)) ||
      (!!currentUserId && row._respondentId === currentUserId),
  };
}

export function matchesApprovalInboxFilter(
  item: TApprovalListItem,
  filter: TApprovalInboxFilter
): boolean {
  if (filter === "mine") return item.isMyTurn;
  if (filter === "pending") return item.status === "pending";
  if (filter === "approved") return item.status === "approved";
  if (filter === "rejected") return item.status === "rejected";
  if (filter === "mineSubmitted") return item.isMineSubmitted;
  return true;
}

export function countApprovalInbox(
  items: TApprovalListItem[]
): Record<TApprovalInboxFilter, number> {
  return {
    mine: items.filter((i) => i.isMyTurn).length,
    pending: items.filter((i) => i.status === "pending").length,
    approved: items.filter((i) => i.status === "approved").length,
    rejected: items.filter((i) => i.status === "rejected").length,
    mineSubmitted: items.filter((i) => i.isMineSubmitted).length,
    all: items.length,
  };
}

export function sortApprovalItems(
  items: TApprovalListItem[],
  sort: TApprovalListSort
): TApprovalListItem[] {
  const copy = [...items];
  if (sort === "waitingDesc") {
    copy.sort((a, b) => {
      const aT = a.waitingSince ? new Date(a.waitingSince).getTime() : Infinity;
      const bT = b.waitingSince ? new Date(b.waitingSince).getTime() : Infinity;
      return aT - bT;
    });
    return copy;
  }
  if (sort === "stepAsc") {
    copy.sort((a, b) => a.currentStep - b.currentStep);
    return copy;
  }
  copy.sort((a, b) => {
    const aT = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const bT = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return bT - aT;
  });
  return copy;
}

export const approvalItemKey = (item: Pick<TApprovalListItem, "rowId" | "fieldId">) =>
  `${item.rowId}:${item.fieldId}`;

export function isSelectableApprovalItem(item: TApprovalListItem): boolean {
  return item.isMyTurn && item.status === "pending";
}

/** 내 결재 대기가 없고 다른 문서가 있으면 전체부터 보여 준다. */
export function shouldDefaultInboxToAll(counts: {
  mine: number;
  all: number;
}): boolean {
  return counts.mine === 0 && counts.all > 0;
}

export function nextMyTurnItem(
  items: TApprovalListItem[],
  excludeRowId?: string
): TApprovalListItem | null {
  return (
    items.find((i) => i.isMyTurn && i.rowId !== excludeRowId) || null
  );
}

export function formatWaitingLabel(days: number): string {
  if (days <= 0) return "오늘";
  return `${days}일 대기`;
}

const uniqueRowsFromItems = (items: TApprovalListItem[]): TAltSheetRow[] => {
  const seen = new Set<string>();
  const out: TAltSheetRow[] = [];
  for (const item of items) {
    if (seen.has(item.rowId)) continue;
    seen.add(item.rowId);
    out.push(item.row);
  }
  return out;
};

/** 체크한 건이 있으면 그것만, 없으면 현재 칩 목록. */
export function resolveApprovalPrintRows(
  visibleItems: TApprovalListItem[],
  selectedKeys: Set<string>
): { rows: TAltSheetRow[]; fromSelection: boolean } {
  const selected = visibleItems.filter((item) =>
    selectedKeys.has(approvalItemKey(item))
  );
  if (selected.length > 0) {
    return { rows: uniqueRowsFromItems(selected), fromSelection: true };
  }
  return { rows: uniqueRowsFromItems(visibleItems), fromSelection: false };
}
