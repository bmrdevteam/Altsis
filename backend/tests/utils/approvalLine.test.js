import {
  validateApprovalSubmit,
  buildApprovalOnSubmit,
  validateCirculationSubmit,
  buildCirculationOnSubmit,
  collectStoredCirculatees,
  addedCirculatees,
  recipientsForFinalApprovalResult,
  buildApprovalAccessOr,
  firstShortTextAnswer,
  approvalNotificationTitle,
  isApprovalLocked,
  canCancelLastApproval,
  applyApprovalCancel,
  applyApprovalAction,
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

  test("fixed approver is kept even when outside pick candidates", () => {
    expect(
      validateApprovalSubmit(fixedField, undefined, {
        approvalCandidates: new Set(["kim"]),
      })
    ).toBeNull();
    const built = buildApprovalOnSubmit(fixedField, undefined, {
      approvalCandidates: new Set(["kim"]),
    });
    expect(built.steps[0].approver.userId).toBe("jo");
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

  test("normal pick line rejects users outside server candidates", () => {
    const field = {
      label: "승인",
      required: true,
      approvalLine: {
        steps: [{ order: 0, label: "1차 승인", mode: "pick" }],
      },
    };
    const submitted = {
      steps: [{ mode: "pick", approver }],
    };
    expect(
      validateApprovalSubmit(field, submitted, {
        approvalCandidates: new Set(["kim"]),
      })
    ).toBe("승인: 지정할 수 없는 승인자가 있습니다.");
  });

  test("server candidate map canonicalizes submitted approver identity", () => {
    const field = {
      label: "승인",
      required: true,
      approvalLine: {
        steps: [{ order: 0, label: "1차 승인", mode: "pick" }],
      },
    };
    const canonical = { user: "real-u1", userId: "jo", userName: "조은길" };
    const submitted = {
      steps: [
        {
          mode: "pick",
          approver: { user: "forged", userId: "jo", userName: "위조 이름" },
        },
      ],
    };
    const options = {
      approvalCandidates: new Map([["jo", canonical]]),
    };
    expect(validateApprovalSubmit(field, submitted, options)).toBeNull();
    expect(buildApprovalOnSubmit(field, submitted, options).steps[0].approver).toEqual(
      canonical
    );
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

  test("nested pick circulation rejects non-members and canonicalizes members", () => {
    const field = {
      label: "승인",
      required: false,
      approvalLine: {
        steps: [{ order: 0, label: "1차 승인", mode: "pick" }],
        circulation: { mode: "pick", users: [] },
      },
    };
    const submitted = {
      circulation: [{ user: "forged", userId: "kim", userName: "위조 이름" }],
    };
    expect(
      validateApprovalSubmit(field, submitted, {
        circulationCandidates: new Set(["jo"]),
      })
    ).toBe("승인: 지정할 수 없는 회람자가 있습니다.");

    const options = {
      circulationCandidates: new Map([["kim", approverB]]),
    };
    expect(validateApprovalSubmit(field, submitted, options)).toBeNull();
    expect(buildApprovalOnSubmit(field, submitted, options).circulation).toEqual([
      approverB,
    ]);
  });

  test("group line replaces form fixed steps and keeps labels", () => {
    const field = {
      label: "승인",
      required: true,
      approvalLine: {
        steps: [{ order: 0, label: "교감", mode: "fixed", approver }],
      },
    };
    const submitted = {
      lineSource: "group",
      version: 2,
      steps: [
        { mode: "pick", label: "부장", approver },
        { mode: "pick", label: "교장", approver: approverB },
      ],
    };
    const options = {
      hasApprovalGroups: true,
      candidateIds: new Set(["jo", "kim"]),
    };
    expect(validateApprovalSubmit(field, submitted, options)).toBeNull();
    const built = buildApprovalOnSubmit(field, submitted, options);
    expect(built.steps).toHaveLength(2);
    expect(built.steps[0].label).toBe("부장");
    expect(built.steps[0].mode).toBe("pick");
    expect(built.steps[0].approver).toEqual(approver);
    expect(built.steps[1].label).toBe("교장");
    expect(built.steps[1].approver).toEqual(approverB);
  });

  test("group line is ignored when the form has no groups", () => {
    const submitted = {
      lineSource: "group",
      version: 2,
      steps: [{ mode: "pick", label: "부장", approver: approverB }],
    };
    const built = buildApprovalOnSubmit(fixedField, submitted, {
      hasApprovalGroups: false,
    });
    expect(built.steps).toHaveLength(1);
    expect(built.steps[0].approver).toEqual(approver);
    expect(built.steps[0].label).toBe("1차 승인");
  });

  test("group line rejects a non-candidate approver", () => {
    const field = {
      label: "승인",
      required: true,
      approvalLine: {
        steps: [{ order: 0, label: "1차 승인", mode: "pick" }],
      },
    };
    expect(
      validateApprovalSubmit(
        field,
        {
          lineSource: "group",
          steps: [{ mode: "pick", label: "부장", approver }],
        },
        { hasApprovalGroups: true, candidateIds: new Set(["kim"]) }
      )
    ).toBe("승인: 지정할 수 없는 승인자가 있습니다.");
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

  test("fixed circulation rejects users removed from the board", () => {
    const field = {
      ...circField,
      circulation: { mode: "fixed", users: [approver] },
    };
    expect(
      validateCirculationSubmit(field, undefined, {
        candidates: new Set(["kim"]),
      })
    ).toBe("회람: 현재 보드에 없는 회람자가 설정되어 있습니다.");
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

  test("pick rejects non-members and uses server-owned identity", () => {
    expect(
      validateCirculationSubmit(circField, [approver], {
        candidates: new Set(["kim"]),
      })
    ).toBe("회람: 지정할 수 없는 회람자가 있습니다.");

    const forged = { user: "forged", userId: "kim", userName: "위조 이름" };
    const options = { candidates: new Map([["kim", approverB]]) };
    expect(validateCirculationSubmit(circField, [forged], options)).toBeNull();
    expect(buildCirculationOnSubmit(circField, [forged], options)).toEqual([
      approverB,
    ]);
  });
});

describe("addedCirculatees", () => {
  test("returns only newly added people and drops duplicates", () => {
    expect(addedCirculatees([approver], [approver, approverB])).toEqual([
      approverB,
    ]);
    expect(addedCirculatees(undefined, [approver])).toEqual([approver]);
    expect(addedCirculatees([approver], [approver])).toEqual([]);
    expect(addedCirculatees([approver], [approverB, approverB])).toEqual([
      approverB,
    ]);
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

  test("reads circulation from Map-like row data", () => {
    const form = {
      fields: [
        { _id: "appr1", type: "approval" },
        { _id: "circ1", type: "circulation" },
      ],
    };
    const rowData = new Map([
      ["appr1", { circulation: [approver] }],
      ["circ1", [approverB]],
    ]);
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

describe("recipientsForFinalApprovalResult", () => {
  const respondent = {
    user: "u0",
    userId: "lee",
    userName: "이제출",
  };

  test("includes submitter and circulatees, skips actor and duplicates", () => {
    expect(
      recipientsForFinalApprovalResult({
        respondent,
        circulatees: [approver, respondent, approverB, { userId: "no-oid" }],
        excludeUserIds: ["jo"],
      })
    ).toEqual([respondent, approverB]);
  });

  test("returns empty when everyone is excluded or invalid", () => {
    expect(
      recipientsForFinalApprovalResult({
        respondent,
        circulatees: [approver],
        excludeUserIds: ["lee", "jo"],
      })
    ).toEqual([]);
    expect(recipientsForFinalApprovalResult({})).toEqual([]);
  });
});

describe("approvalNotificationTitle", () => {
  const form = {
    title: "출석부",
    fields: [
      { _id: "c1", type: "content", order: 0 },
      { _id: "t2", type: "textarea", order: 1 },
      { _id: "s1", type: "text", order: 3, label: "둘째 단답" },
      { _id: "s0", type: "text", order: 2, label: "첫 단답" },
    ],
  };

  test("uses the first text field by order", () => {
    expect(firstShortTextAnswer(form, { s0: "현장학습 신청", s1: "다른 값" })).toBe(
      "현장학습 신청"
    );
    expect(
      firstShortTextAnswer(form, {
        get: (id) => (id === "s0" ? "  맵에서 온 값  " : ""),
      })
    ).toBe("맵에서 온 값");
  });

  test("falls back to form title and clamps length", () => {
    expect(firstShortTextAnswer(form, {})).toBe("");
    expect(approvalNotificationTitle(form, {}, "request")).toBe(
      "출석부 · 승인 요청"
    );
    const long = "가".repeat(50);
    expect(firstShortTextAnswer(form, { s0: `${long}\n줄바꿈` })).toBe(
      `${"가".repeat(40)}…`
    );
  });

  test("builds kind suffixes", () => {
    const data = { s0: "현장학습" };
    expect(approvalNotificationTitle(form, data, "request")).toBe(
      "현장학습 · 승인 요청"
    );
    expect(approvalNotificationTitle(form, data, "circulation")).toBe(
      "현장학습 · 회람"
    );
    expect(approvalNotificationTitle(form, data, "approved")).toBe(
      "현장학습 · 승인됨"
    );
    expect(approvalNotificationTitle(form, data, "rejected")).toBe(
      "현장학습 · 반려됨"
    );
    expect(approvalNotificationTitle(form, data, "stepApproved", "2차")).toBe(
      "현장학습 · 「2차」승인됨"
    );
    expect(approvalNotificationTitle(form, data, "stepCancelled", "담임")).toBe(
      "현장학습 · 「담임」승인 취소"
    );
    expect(approvalNotificationTitle(form, data, "approvalReopened")).toBe(
      "현장학습 · 최종 승인 취소"
    );
    expect(approvalNotificationTitle(form, data, "requestWithdrawn")).toBe(
      "현장학습 · 승인 요청 철회"
    );
  });
});

describe("isApprovalLocked", () => {
  const field = {
    _id: "ap1",
    type: "approval",
    approvalLine: {
      steps: [{ order: 0, label: "1차 승인", mode: "fixed", approver }],
    },
  };
  const pendingValue = {
    version: 2,
    currentStep: 0,
    overallStatus: "pending",
    steps: [
      {
        order: 0,
        label: "1차 승인",
        mode: "fixed",
        approver,
        status: "pending",
      },
    ],
  };

  test("draft stays unlocked even with approval data", () => {
    expect(
      isApprovalLocked(
        { isDraft: true, data: { ap1: pendingValue } },
        [field]
      )
    ).toBe(false);
  });

  test("submitted row without approval field stays unlocked", () => {
    expect(
      isApprovalLocked({ isDraft: false, data: { title: "hello" } }, [
        { _id: "t1", type: "text" },
      ])
    ).toBe(false);
  });

  test("pending approval with no acted step stays unlocked", () => {
    expect(
      isApprovalLocked({ isDraft: false, data: { ap1: pendingValue } }, [
        field,
      ])
    ).toBe(false);
  });

  test("first-step approve locks even if later steps are pending", () => {
    expect(
      isApprovalLocked(
        {
          data: {
            ap1: {
              version: 2,
              currentStep: 1,
              overallStatus: "pending",
              steps: [
                {
                  order: 0,
                  label: "1차 승인",
                  mode: "fixed",
                  approver,
                  status: "approved",
                  actedAt: "2026-09-05T00:00:00.000Z",
                },
                {
                  order: 1,
                  label: "2차 승인",
                  mode: "fixed",
                  approver,
                  status: "pending",
                },
              ],
            },
          },
        },
        [field]
      )
    ).toBe(true);
  });

  test("approved and rejected lock the row", () => {
    expect(
      isApprovalLocked(
        {
          data: {
            ap1: { ...pendingValue, overallStatus: "approved", status: "approved" },
          },
        },
        [field]
      )
    ).toBe(true);
    expect(
      isApprovalLocked(
        {
          data: {
            ap1: { ...pendingValue, overallStatus: "rejected", status: "rejected" },
          },
        },
        [field]
      )
    ).toBe(true);
  });

  test("skipped empty-step approval still locks", () => {
    expect(
      isApprovalLocked(
        {
          data: {
            ap1: {
              version: 2,
              currentStep: 0,
              overallStatus: "approved",
              steps: [],
            },
          },
        },
        [field]
      )
    ).toBe(true);
  });

  test("submitted row with no approval value stays unlocked", () => {
    expect(isApprovalLocked({ data: { ap1: null } }, [field])).toBe(false);
  });
});

describe("applyApprovalCancel", () => {
  const step = (label, person, status, extra = {}) => ({
    order: 0,
    label,
    mode: "pick",
    approver: person,
    status,
    ...extra,
  });

  const midLine = {
    version: 2,
    lineSource: "group",
    currentStep: 1,
    overallStatus: "pending",
    circulation: [{ user: "u3", userId: "lee", userName: "이회람" }],
    steps: [
      step("담임", approver, "approved", {
        actedAt: "2026-10-01T00:00:00.000Z",
        reason: "확인",
      }),
      step("교감", approverB, "pending"),
    ],
  };

  test("rewinds one approved step and keeps history", () => {
    expect(canCancelLastApproval(midLine, "jo")).toBe(true);
    expect(canCancelLastApproval(midLine, "kim")).toBe(false);
    const result = applyApprovalCancel(midLine, {}, "jo");
    expect(result.ok).toBe(true);
    expect(result.reopenedFinal).toBe(false);
    expect(result.withdrawnApprover.userId).toBe("kim");
    expect(result.value.overallStatus).toBe("pending");
    expect(result.value.currentStep).toBe(0);
    expect(result.value.currentApproverUserId).toBe("jo");
    expect(result.value.lineSource).toBe("group");
    expect(result.value.steps[0].status).toBe("pending");
    expect(result.value.steps[0].actedAt).toBeUndefined();
    expect(result.value.steps[0].reason).toBeUndefined();
    expect(result.value.steps[1].status).toBe("waiting");
    expect(result.value.cancelHistory).toHaveLength(1);
    expect(result.value.cancelHistory[0]).toMatchObject({
      stepIndex: 0,
      stepLabel: "담임",
      userId: "jo",
      reason: "확인",
      reopenedFinal: false,
    });
    expect(canCancelLastApproval(result.value, "jo")).toBe(false);
    expect(
      isApprovalLocked({ data: { ap1: result.value } }, [
        { _id: "ap1", type: "approval" },
      ])
    ).toBe(false);
  });

  test("reopens a final approval onto the last step only", () => {
    const finalValue = {
      version: 2,
      currentStep: 1,
      overallStatus: "approved",
      steps: [
        step("담임", approver, "approved", {
          actedAt: "2026-10-01T00:00:00.000Z",
        }),
        step("교감", approverB, "approved", {
          actedAt: "2026-10-02T00:00:00.000Z",
          reason: "결재",
        }),
      ],
    };
    expect(canCancelLastApproval(finalValue, "jo")).toBe(false);
    const result = applyApprovalCancel(finalValue, {}, "kim");
    expect(result.ok).toBe(true);
    expect(result.reopenedFinal).toBe(true);
    expect(result.withdrawnApprover).toBeNull();
    expect(result.value.overallStatus).toBe("pending");
    expect(result.value.currentStep).toBe(1);
    expect(result.value.steps[0].status).toBe("approved");
    expect(result.value.steps[1].status).toBe("pending");
    expect(result.value.steps[1].reason).toBeUndefined();
    expect(
      isApprovalLocked({ data: { ap1: result.value } }, [
        { _id: "ap1", type: "approval" },
      ])
    ).toBe(true);
  });

  test("refuses cancel after rejection or when a later step already moved", () => {
    const rejected = {
      version: 2,
      currentStep: 1,
      overallStatus: "rejected",
      steps: [
        step("담임", approver, "approved"),
        step("교감", approverB, "rejected"),
      ],
    };
    expect(applyApprovalCancel(rejected, {}, "jo").ok).toBe(false);
    expect(applyApprovalCancel(midLine, {}, "kim")).toEqual({
      ok: false,
      message: "승인 취소 권한이 없습니다.",
    });
    expect(applyApprovalCancel(null, {}, "jo")).toEqual({
      ok: false,
      message: "승인 데이터가 없습니다.",
    });
  });

  test("a later approval keeps the cancel history", () => {
    const cancelled = applyApprovalCancel(midLine, {}, "jo");
    const again = applyApprovalAction(cancelled.value, {}, "jo", "approved", "");
    expect(again.ok).toBe(true);
    expect(again.value.currentStep).toBe(1);
    expect(again.value.steps[1].status).toBe("pending");
    expect(again.value.cancelHistory).toHaveLength(1);
    expect(again.value.lineSource).toBe("group");
  });
});

