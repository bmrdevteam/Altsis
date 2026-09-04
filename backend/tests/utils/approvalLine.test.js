import {
  validateApprovalSubmit,
  buildApprovalOnSubmit,
  validateCirculationSubmit,
  buildCirculationOnSubmit,
  collectStoredCirculatees,
  buildApprovalAccessOr,
} from "../../src/utils/approvalLine.js";

const approver = {
  user: "u1",
  userId: "jo",
  userName: "조은길",
};

const approverB = {
  user: "u2",
  userId: "kim",
  userName: "김민수",
};

const fixedField = {
  label: "승인",
  approvalLine: {
    steps: [{ order: 0, label: "1차 승인", mode: "fixed", approver }],
  },
};

describe("approvalLine submit", () => {
  test("all-fixed required field accepts empty submitted value", () => {
    expect(validateApprovalSubmit(fixedField, undefined)).toBeNull();
    expect(validateApprovalSubmit(fixedField, null)).toBeNull();
    expect(validateApprovalSubmit(fixedField, {})).toBeNull();
  });

  test("all-fixed empty submit still builds v2 from the form line", () => {
    const built = buildApprovalOnSubmit(fixedField, undefined);
    expect(built.version).toBe(2);
    expect(built.overallStatus).toBe("pending");
    expect(built.steps[0].status).toBe("pending");
    expect(built.steps[0].approver).toEqual(approver);
    expect(built.currentApproverUserId).toBe("jo");
  });

  test("all-fixed without configured approver is a form error", () => {
    const field = {
      label: "승인",
      approvalLine: {
        steps: [{ order: 0, label: "1차 승인", mode: "fixed" }],
      },
    };
    expect(validateApprovalSubmit(field, undefined)).toBe(
      "승인: 고정 승인자가 설정되지 않았습니다."
    );
  });

  test("required pick line with no approver is rejected", () => {
    const field = {
      label: "승인",
      required: true,
      approvalLine: {
        steps: [{ order: 0, label: "1차 승인", mode: "pick" }],
      },
    };
    expect(validateApprovalSubmit(field, undefined)).toBe(
      "승인: 승인자를 한 명 이상 선택해주세요."
    );
  });

  test("optional pick line with no approver auto-approves empty steps", () => {
    const field = {
      label: "승인",
      required: false,
      approvalLine: {
        steps: [{ order: 0, label: "1차 승인", mode: "pick" }],
      },
    };
    expect(validateApprovalSubmit(field, undefined)).toBeNull();
    const built = buildApprovalOnSubmit(field, undefined);
    expect(built.overallStatus).toBe("approved");
    expect(built.status).toBe("approved");
    expect(built.steps).toEqual([]);
    expect(built.currentApproverUserId).toBeUndefined();
  });

  test("skips empty pick steps and keeps 1st and 3rd labels", () => {
    const field = {
      label: "승인",
      required: true,
      approvalLine: {
        steps: [
          { order: 0, label: "1차 승인", mode: "pick" },
          { order: 1, label: "2차 승인", mode: "pick" },
          { order: 2, label: "3차 승인", mode: "pick" },
          { order: 3, label: "4차 승인", mode: "pick" },
        ],
      },
    };
    const submitted = {
      version: 2,
      steps: [
        { mode: "pick", approver },
        { mode: "pick" },
        { mode: "pick", approver: approverB },
        { mode: "pick" },
      ],
    };
    expect(validateApprovalSubmit(field, submitted)).toBeNull();
    const built = buildApprovalOnSubmit(field, submitted);
    expect(built.overallStatus).toBe("pending");
    expect(built.steps).toHaveLength(2);
    expect(built.steps[0].label).toBe("1차 승인");
    expect(built.steps[0].status).toBe("pending");
    expect(built.steps[0].approver).toEqual(approver);
    expect(built.steps[1].label).toBe("3차 승인");
    expect(built.steps[1].status).toBe("waiting");
    expect(built.steps[1].approver).toEqual(approverB);
    expect(built.currentApproverUserId).toBe("jo");
  });

  test("fixed step remains when pick steps are empty", () => {
    const field = {
      label: "승인",
      required: true,
      approvalLine: {
        steps: [
          { order: 0, label: "1차 승인", mode: "fixed", approver },
          { order: 1, label: "2차 승인", mode: "pick" },
        ],
      },
    };
    const submitted = {
      version: 2,
      steps: [{ mode: "fixed", approver }, { mode: "pick" }],
    };
    expect(validateApprovalSubmit(field, submitted)).toBeNull();
    const built = buildApprovalOnSubmit(field, submitted);
    expect(built.steps).toHaveLength(1);
    expect(built.steps[0].label).toBe("1차 승인");
    expect(built.steps[0].approver).toEqual(approver);
    expect(built.steps[0].status).toBe("pending");
  });

  test("fixed circulation uses form users and ignores submitted list", () => {
    const field = {
      label: "승인",
      approvalLine: {
        steps: [{ order: 0, label: "1차 승인", mode: "fixed", approver }],
        circulation: { mode: "fixed", users: [approver, approverB] },
      },
    };
    const built = buildApprovalOnSubmit(field, {
      circulation: [{ user: "x", userId: "other", userName: "다른사람" }],
    });
    expect(built.circulation).toEqual([approver, approverB]);
  });

  test("pick circulation uses submitted list and defaults to empty", () => {
    const field = {
      label: "승인",
      approvalLine: {
        steps: [{ order: 0, label: "1차 승인", mode: "pick" }],
        circulation: { mode: "pick", users: [approver] },
      },
    };
    expect(buildApprovalOnSubmit(field, undefined).circulation).toEqual([]);
    const built = buildApprovalOnSubmit(field, {
      version: 2,
      steps: [{ mode: "pick", approver }],
      circulation: [approverB],
    });
    expect(built.circulation).toEqual([approverB]);
  });

  test("pick circulation drops duplicate userIds", () => {
    const field = {
      label: "승인",
      required: false,
      approvalLine: {
        steps: [{ order: 0, label: "1차 승인", mode: "pick" }],
        circulation: { mode: "pick", users: [] },
      },
    };
    const built = buildApprovalOnSubmit(field, {
      circulation: [approver, { ...approver, userName: "다른표기" }, approverB],
    });
    expect(built.circulation).toEqual([approver, approverB]);
  });

  test("missing or off circulation ignores submitted list", () => {
    const submitted = {
      circulation: [approver],
    };
    expect(buildApprovalOnSubmit(fixedField, submitted).circulation).toEqual(
      []
    );
    const offField = {
      label: "승인",
      approvalLine: {
        steps: [{ order: 0, label: "1차 승인", mode: "fixed", approver }],
        circulation: { mode: "off", users: [approver] },
      },
    };
    expect(buildApprovalOnSubmit(offField, submitted).circulation).toEqual([]);
  });
});

describe("circulation field submit", () => {
  const circField = {
    _id: "circ1",
    label: "회람",
    type: "circulation",
    circulation: { mode: "pick", users: [] },
  };

  test("pick uses submitted list", () => {
    expect(buildCirculationOnSubmit(circField, undefined)).toEqual([]);
    expect(buildCirculationOnSubmit(circField, [approver, approverB])).toEqual([
      approver,
      approverB,
    ]);
  });

  test("fixed uses form users", () => {
    const field = {
      ...circField,
      circulation: { mode: "fixed", users: [approver, approverB] },
    };
    expect(
      buildCirculationOnSubmit(field, [
        { user: "x", userId: "other", userName: "다른사람" },
      ])
    ).toEqual([approver, approverB]);
  });

  test("required pick with no users is rejected", () => {
    expect(
      validateCirculationSubmit({ ...circField, required: true }, [])
    ).toBe("회람: 회람자를 한 명 이상 선택해주세요.");
  });

  test("fixed without users is a form error", () => {
    expect(
      validateCirculationSubmit({
        ...circField,
        circulation: { mode: "fixed", users: [] },
      })
    ).toBe("회람: 고정 회람자가 설정되지 않았습니다.");
  });
});

describe("collectStoredCirculatees and access or", () => {
  test("merges nested approval circulation and dedicated field", () => {
    const form = {
      fields: [
        { _id: "appr1", type: "approval" },
        { _id: "circ1", type: "circulation" },
      ],
    };
    const rowData = {
      appr1: { circulation: [approver] },
      circ1: [approverB],
    };
    expect(collectStoredCirculatees(form, rowData)).toEqual([
      approver,
      approverB,
    ]);
  });

  test("buildApprovalAccessOr includes circulation field userId", () => {
    const form = {
      fields: [
        { _id: "appr1", type: "approval" },
        { _id: "circ1", type: "circulation" },
      ],
    };
    const conds = buildApprovalAccessOr(form, "jo");
    expect(conds).toEqual(
      expect.arrayContaining([
        { "data.appr1.approver.userId": "jo" },
        { "data.appr1.circulation.userId": "jo" },
        { "data.circ1.userId": "jo" },
      ])
    );
  });
});
