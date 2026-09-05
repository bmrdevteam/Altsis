import { authorizeSheetRowFieldUpdate } from "../../src/utils/sheetRowUpdate.js";

const approvalField = { _id: "approval", type: "approval", permission: "owner" };
const textField = { _id: "text", type: "text", permission: "respondent" };

describe("authorizeSheetRowFieldUpdate", () => {
  test("approval action requires an approved/rejected transition by current approver", () => {
    expect(
      authorizeSheetRowFieldUpdate({
        field: approvalField,
        value: { status: "pending", version: 2 },
        isAdmin: true,
        canApproveAny: false,
        isCurrentFieldApprover: false,
      })
    ).toEqual({ ok: false, message: "잘못된 승인 상태입니다." });

    expect(
      authorizeSheetRowFieldUpdate({
        field: approvalField,
        value: { status: "approved" },
        isAdmin: true,
        canApproveAny: false,
        isCurrentFieldApprover: false,
      })
    ).toEqual({ ok: false, message: "현재 결재 권한이 없습니다." });

    expect(
      authorizeSheetRowFieldUpdate({
        field: approvalField,
        value: { status: "approved" },
        isAdmin: false,
        canApproveAny: true,
        isCurrentFieldApprover: true,
      })
    ).toEqual({ ok: true, kind: "approval" });
  });

  test("current approver cannot write unknown, owner, complex, or circulation fields", () => {
    const base = {
      value: "변조",
      isAdmin: false,
      canApproveAny: true,
      isCurrentFieldApprover: false,
    };
    expect(authorizeSheetRowFieldUpdate({ ...base, field: null }).ok).toBe(false);
    expect(
      authorizeSheetRowFieldUpdate({
        ...base,
        field: { ...textField, permission: "owner" },
      }).ok
    ).toBe(false);
    expect(
      authorizeSheetRowFieldUpdate({
        ...base,
        field: { ...textField, type: "file" },
      }).ok
    ).toBe(false);
    expect(
      authorizeSheetRowFieldUpdate({
        ...base,
        field: { ...textField, type: "circulation" },
      }).ok
    ).toBe(false);
  });

  test("current approver may edit a simple respondent field and admin may edit known fields", () => {
    expect(
      authorizeSheetRowFieldUpdate({
        field: textField,
        value: "수정",
        isAdmin: false,
        canApproveAny: true,
        isCurrentFieldApprover: false,
      })
    ).toEqual({ ok: true, kind: "field" });
    expect(
      authorizeSheetRowFieldUpdate({
        field: { ...textField, permission: "owner" },
        value: "관리자 수정",
        isAdmin: true,
        canApproveAny: false,
        isCurrentFieldApprover: false,
      })
    ).toEqual({ ok: true, kind: "field" });
  });
});
