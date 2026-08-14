import { TAltForm } from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import { getRequiredResponseCount } from "./activityStatusVisual";

/** 응답 초안 행. 양식 AltForm.isDraft(비공개)와 다르다. */
export const isDraftSheetRow = (
  row: Pick<TAltSheetRow, "isDraft"> | null | undefined
): boolean => !!row?.isDraft;

export const isSubmittedSheetRow = (
  row: Pick<TAltSheetRow, "isDraft"> | null | undefined
): boolean => !!row && !row.isDraft;

export const splitMyRows = (
  rows: TAltSheetRow[] | null | undefined
): { draftRows: TAltSheetRow[]; submittedRows: TAltSheetRow[] } => {
  const draftRows: TAltSheetRow[] = [];
  const submittedRows: TAltSheetRow[] = [];
  for (const row of rows || []) {
    if (isDraftSheetRow(row)) draftRows.push(row);
    else submittedRows.push(row);
  }
  return { draftRows, submittedRows };
};

const timeValue = (raw?: string) => {
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
};

/** 내 응답 캐러셀: 초안(최근 저장) 먼저, 그다음 제출본(최근 제출) */
export const sortMyRowsForReview = (
  rows: TAltSheetRow[] | null | undefined
): TAltSheetRow[] => {
  const { draftRows, submittedRows } = splitMyRows(rows);
  const drafts = [...draftRows].sort(
    (a, b) => timeValue(b._updatedAt) - timeValue(a._updatedAt)
  );
  const submitted = [...submittedRows].sort(
    (a, b) => timeValue(b._submittedAt) - timeValue(a._submittedAt)
  );
  return [...drafts, ...submitted];
};

/** 목표 N이 있으면 제출+초안이 N을 넘지 않게. 없으면 제한 없음(음수 아님). */
export const remainingDraftSlots = (
  form: TAltForm | null | undefined,
  submittedCount: number,
  draftCount: number
): number | null => {
  const target = getRequiredResponseCount(form);
  if (target == null) return null;
  return Math.max(0, target - submittedCount - draftCount);
};

export const canCreateAdditionalDraft = (
  form: TAltForm | null | undefined,
  submittedCount: number,
  draftCount: number
): boolean => {
  if (!form) return false;
  if (form.settings?.directInputMode) return false;
  if (!form.settings?.allowMultipleResponses) {
    return submittedCount === 0 && draftCount === 0;
  }
  const left = remainingDraftSlots(form, submittedCount, draftCount);
  if (left == null) return true;
  return left > 0;
};
