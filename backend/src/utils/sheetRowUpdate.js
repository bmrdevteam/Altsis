import { getCirculationConfig } from "./approvalLine.js";

const APPROVER_NON_EDITABLE_FIELD_TYPES = new Set([
  "multiDate",
  "multiSelect",
  "userSelect",
  "link",
  "checkbox",
  "rating",
  "scale",
  "counter",
  "approval",
  "circulation",
  "content",
  "aiChat",
]);

/**
 * Classify one PUT /alt-sheet-rows/:id field update.
 * Approval state is always a server-side transition.
 * Pick circulation may be rewritten by an admin or current approver.
 */
export function authorizeSheetRowFieldUpdate({
  field,
  value,
  isAdmin,
  canApproveAny,
  isCurrentFieldApprover,
}) {
  if (!field) {
    return { ok: false, message: "존재하지 않는 항목입니다." };
  }

  if (field.type === "approval") {
    if (value?.status !== "approved" && value?.status !== "rejected") {
      return { ok: false, message: "잘못된 승인 상태입니다." };
    }
    if (!isCurrentFieldApprover) {
      return { ok: false, message: "현재 결재 권한이 없습니다." };
    }
    return { ok: true, kind: "approval" };
  }

  if (field.type === "circulation") {
    if (!isAdmin && !canApproveAny) {
      return { ok: false, message: "수정 권한이 없습니다." };
    }
    if (getCirculationConfig(field).mode !== "pick") {
      return { ok: false, message: "제출된 회람자는 변경할 수 없습니다." };
    }
    return { ok: true, kind: "circulation" };
  }

  if (isAdmin) {
    return { ok: true, kind: "field" };
  }

  if (
    !canApproveAny ||
    field.permission !== "respondent" ||
    APPROVER_NON_EDITABLE_FIELD_TYPES.has(field.type)
  ) {
    return { ok: false, message: "수정 권한이 없습니다." };
  }

  return { ok: true, kind: "field" };
}
