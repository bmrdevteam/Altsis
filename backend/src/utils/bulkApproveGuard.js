import { FIELD_REQUIRED } from "../messages/index.js";

export const BULK_APPROVE_MAX = 50;

/**
 * Validate POST /alt-sheet-rows/bulk-approve body.
 * @param {object} body
 * @returns {{ ok: true, form: string, items: { rowId: string, fieldId: string }[], status: "approved"|"rejected", reason: string } | { ok: false, status: number, message: string }}
 */
export function validateBulkApproveRequest(body) {
  const form = body?.form != null ? String(body.form).trim() : "";
  if (!form) {
    return { ok: false, status: 400, message: FIELD_REQUIRED("form") };
  }

  const status = body?.status;
  if (status !== "approved" && status !== "rejected") {
    return { ok: false, status: 400, message: "잘못된 승인 상태입니다." };
  }

  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (status === "rejected" && !reason) {
    return { ok: false, status: 400, message: "반려 사유를 입력하세요." };
  }

  if (!Array.isArray(body?.items) || body.items.length === 0) {
    return { ok: false, status: 400, message: "승인할 항목이 없습니다." };
  }
  if (body.items.length > BULK_APPROVE_MAX) {
    return {
      ok: false,
      status: 400,
      message: `한 번에 ${BULK_APPROVE_MAX}건까지 처리할 수 있습니다.`,
    };
  }

  const items = [];
  const seen = new Set();
  for (const item of body.items) {
    const rowId = item?.rowId != null ? String(item.rowId).trim() : "";
    const fieldId = item?.fieldId != null ? String(item.fieldId).trim() : "";
    if (!rowId || !fieldId) {
      return {
        ok: false,
        status: 400,
        message: "행과 결재 항목이 필요합니다.",
      };
    }
    const key = `${rowId}:${fieldId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ rowId, fieldId });
  }

  if (items.length === 0) {
    return { ok: false, status: 400, message: "승인할 항목이 없습니다." };
  }

  return { ok: true, form, items, status, reason };
}
