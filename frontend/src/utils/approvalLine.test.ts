import { getRequiredApprovalError } from "./approvalLine";

const approver = {
  user: "u1",
  userId: "jo",
  userName: "조은길",
};

describe("getRequiredApprovalError", () => {
  test("all-fixed line passes with empty respondent value", () => {
    const field = {
      approvalLine: {
        steps: [
          { order: 0, label: "1차 승인", mode: "fixed" as const, approver },
        ],
      },
    };
    expect(getRequiredApprovalError(field, undefined)).toBeNull();
    expect(getRequiredApprovalError(field, null)).toBeNull();
    expect(getRequiredApprovalError(field, "")).toBeNull();
  });

  test("pick line without approver is required input", () => {
    const field = {
      approvalLine: {
        steps: [{ order: 0, label: "1차 승인", mode: "pick" as const }],
      },
    };
    expect(getRequiredApprovalError(field, undefined)).toBe(
      "승인자를 선택해주세요."
    );
    expect(
      getRequiredApprovalError(field, { approver: { userId: "jo" } })
    ).toBeNull();
  });

  test("mixed line requires pick approvers in v2 steps", () => {
    const field = {
      approvalLine: {
        steps: [
          { order: 0, label: "1차 승인", mode: "fixed" as const, approver },
          { order: 1, label: "2차 승인", mode: "pick" as const },
        ],
      },
    };
    expect(
      getRequiredApprovalError(field, {
        version: 2,
        steps: [
          { mode: "fixed", approver },
          { mode: "pick" },
        ],
      })
    ).toBe("승인자를 모두 선택해주세요.");
    expect(
      getRequiredApprovalError(field, {
        version: 2,
        steps: [
          { mode: "fixed", approver },
          { mode: "pick", approver: { userId: "other" } },
        ],
      })
    ).toBeNull();
  });
});
