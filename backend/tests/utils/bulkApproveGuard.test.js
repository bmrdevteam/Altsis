import {
  BULK_APPROVE_MAX,
  validateBulkApproveRequest,
} from "../../src/utils/bulkApproveGuard.js";

describe("validateBulkApproveRequest", () => {
  const item = { rowId: "r1", fieldId: "f1" };

  test("requires form", () => {
    const result = validateBulkApproveRequest({
      items: [item],
      status: "approved",
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe("FORM_REQUIRED");
  });

  test("rejects empty items", () => {
    const result = validateBulkApproveRequest({
      form: "form1",
      items: [],
      status: "approved",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("승인할 항목이 없습니다.");
  });

  test("rejects missing items", () => {
    const result = validateBulkApproveRequest({
      form: "form1",
      status: "approved",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("승인할 항목이 없습니다.");
  });

  test("rejects more than max items", () => {
    const items = Array.from({ length: BULK_APPROVE_MAX + 1 }, (_, i) => ({
      rowId: `r${i}`,
      fieldId: "f1",
    }));
    const result = validateBulkApproveRequest({
      form: "form1",
      items,
      status: "approved",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain(String(BULK_APPROVE_MAX));
  });

  test("rejects reject without reason", () => {
    const result = validateBulkApproveRequest({
      form: "form1",
      items: [item],
      status: "rejected",
      reason: "   ",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("반려 사유를 입력하세요.");
  });

  test("rejects invalid status", () => {
    const result = validateBulkApproveRequest({
      form: "form1",
      items: [item],
      status: "pending",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("잘못된 승인 상태입니다.");
  });

  test("rejects item without rowId or fieldId", () => {
    const result = validateBulkApproveRequest({
      form: "form1",
      items: [{ rowId: "r1" }],
      status: "approved",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("행과 결재 항목이 필요합니다.");
  });

  test("accepts approve and dedupes items", () => {
    const result = validateBulkApproveRequest({
      form: "form1",
      items: [item, { ...item }, { rowId: "r2", fieldId: "f1" }],
      status: "approved",
    });
    expect(result.ok).toBe(true);
    expect(result.items).toEqual([
      { rowId: "r1", fieldId: "f1" },
      { rowId: "r2", fieldId: "f1" },
    ]);
    expect(result.reason).toBe("");
  });

  test("accepts reject with trimmed reason", () => {
    const result = validateBulkApproveRequest({
      form: "form1",
      items: [item],
      status: "rejected",
      reason: "  서류 미비  ",
    });
    expect(result.ok).toBe(true);
    expect(result.reason).toBe("서류 미비");
  });
});
