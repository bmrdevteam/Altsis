import {
  validateApprovalSubmit,
  buildApprovalOnSubmit,
} from "../../src/utils/approvalLine.js";

const approver = {
  user: "u1",
  userId: "jo",
  userName: "조은길",
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

  test("pick line still requires an approver", () => {
    const field = {
      label: "승인",
      approvalLine: {
        steps: [{ order: 0, label: "1차 승인", mode: "pick" }],
      },
    };
    expect(validateApprovalSubmit(field, undefined)).toBe(
      "승인: 「1차 승인」승인자를 선택해주세요."
    );
  });
});
