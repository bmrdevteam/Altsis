import {
  formatApproverLabel,
  formatCirculationLabels,
  formatCirculationNames,
  getApprovalCirculation,
  getRequiredApprovalError,
  isCurrentApprover,
} from "./approvalLine";

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

describe("approval circulation helpers", () => {
  test("missing circulation defaults to off with empty users", () => {
    expect(
      getApprovalCirculation({
        approvalLine: {
          steps: [{ order: 0, label: "1차 승인", mode: "pick" }],
        },
      })
    ).toEqual({ mode: "off", users: [] });
  });

  test("formatCirculationNames joins user names", () => {
    expect(formatCirculationNames(null)).toBe("");
    expect(
      formatCirculationNames({
        version: 2,
        currentStep: 0,
        overallStatus: "pending",
        steps: [],
        circulation: [approver, { user: "u2", userId: "kim", userName: "김민수" }],
      })
    ).toBe("조은길, 김민수");
  });

  test("formatApproverLabel uses name and id", () => {
    expect(formatApproverLabel(approver)).toBe("조은길 (jo)");
    expect(formatApproverLabel({ userName: "조은길", userId: "조은길" })).toBe(
      "조은길"
    );
    expect(formatApproverLabel({ userName: "", userId: "jo" })).toBe("jo");
  });

  test("formatCirculationLabels joins name (id)", () => {
    expect(formatCirculationLabels(null)).toBe("");
    expect(
      formatCirculationLabels({
        version: 2,
        currentStep: 0,
        overallStatus: "pending",
        steps: [],
        circulation: [approver, { user: "u2", userId: "kim", userName: "김민수" }],
      })
    ).toBe("조은길 (jo), 김민수 (kim)");
  });
});

describe("isCurrentApprover", () => {
  const pendingValue = {
    version: 2 as const,
    currentStep: 0,
    overallStatus: "pending" as const,
    steps: [
      {
        order: 0,
        label: "1차 승인",
        mode: "pick" as const,
        approver,
        status: "pending" as const,
      },
    ],
  };

  test("true when the user is the pending current-step approver", () => {
    expect(isCurrentApprover(pendingValue, "jo")).toBe(true);
  });

  test("false for another user or missing userId", () => {
    expect(isCurrentApprover(pendingValue, "kim")).toBe(false);
    expect(isCurrentApprover(pendingValue, undefined)).toBe(false);
  });

  test("false after the line is approved or rejected", () => {
    expect(
      isCurrentApprover(
        {
          ...pendingValue,
          overallStatus: "approved",
          steps: [{ ...pendingValue.steps[0], status: "approved" }],
        },
        "jo"
      )
    ).toBe(false);
    expect(
      isCurrentApprover(
        {
          ...pendingValue,
          overallStatus: "rejected",
          currentStep: 0,
          steps: [{ ...pendingValue.steps[0], status: "rejected" }],
        },
        "jo"
      )
    ).toBe(false);
  });

  test("false when a later step is pending for someone else", () => {
    expect(
      isCurrentApprover(
        {
          version: 2,
          currentStep: 1,
          overallStatus: "pending",
          steps: [
            {
              order: 0,
              label: "1차 승인",
              mode: "pick" as const,
              approver,
              status: "approved" as const,
            },
            {
              order: 1,
              label: "2차 승인",
              mode: "pick" as const,
              approver: { user: "u2", userId: "kim", userName: "김민수" },
              status: "pending" as const,
            },
          ],
        },
        "jo"
      )
    ).toBe(false);
    expect(
      isCurrentApprover(
        {
          version: 2,
          currentStep: 1,
          overallStatus: "pending",
          steps: [
            {
              order: 0,
              label: "1차 승인",
              mode: "pick" as const,
              approver,
              status: "approved" as const,
            },
            {
              order: 1,
              label: "2차 승인",
              mode: "pick" as const,
              approver: { user: "u2", userId: "kim", userName: "김민수" },
              status: "pending" as const,
            },
          ],
        },
        "kim"
      )
    ).toBe(true);
  });
});
