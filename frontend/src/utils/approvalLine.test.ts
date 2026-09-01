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

  test("pick line without any approver is required input", () => {
    const field = {
      approvalLine: {
        steps: [{ order: 0, label: "1차 승인", mode: "pick" as const }],
      },
    };
    expect(getRequiredApprovalError(field, undefined)).toBe(
      "승인자를 한 명 이상 선택해주세요."
    );
    expect(
      getRequiredApprovalError(field, { approver: { userId: "jo" } })
    ).toBeNull();
  });

  test("pick line passes when one of several picks is filled", () => {
    const field = {
      approvalLine: {
        steps: [
          { order: 0, label: "1차 승인", mode: "pick" as const },
          { order: 1, label: "2차 승인", mode: "pick" as const },
        ],
      },
    };
    expect(
      getRequiredApprovalError(field, {
        version: 2,
        steps: [
          { mode: "pick", approver: { userId: "jo" } },
          { mode: "pick" },
        ],
      })
    ).toBeNull();
    expect(
      getRequiredApprovalError(field, {
        version: 2,
        steps: [{ mode: "pick" }, { mode: "pick" }],
      })
    ).toBe("승인자를 한 명 이상 선택해주세요.");
  });

  test("mixed line passes when fixed has an approver even if pick is empty", () => {
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
        steps: [{ mode: "fixed", approver }, { mode: "pick" }],
      })
    ).toBeNull();
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
