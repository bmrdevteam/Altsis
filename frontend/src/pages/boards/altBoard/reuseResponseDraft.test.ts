import {
  copyRowDataForReuse,
  filterReusedPickPeople,
  formatReusedDroppedNotice,
  mergeRowDataForEdit,
  resolveFreshComposeData,
  seedComposePickDefaults,
  shouldApplyExternalViewMode,
  shouldStartNewCompose,
  urlModeToViewMode,
  viewModeToUrlMode,
} from "./reuseResponseDraft";

const fields = [
  { _id: "text1", type: "text" as const },
  { _id: "file1", type: "file" as const },
  { _id: "appr1", type: "approval" as const },
  { _id: "chat1", type: "aiChat" as const },
];

const jo = { user: "u1", userId: "jo", userName: "조은길" };
const kim = { user: "u2", userId: "kim", userName: "김민수" };

describe("shouldApplyExternalViewMode", () => {
  test("keeps skip and does not apply when URL arrives first during internal edit", () => {
    expect(
      shouldApplyExternalViewMode({
        skipInternal: true,
        internalMode: "review",
        externalMode: "compose",
      })
    ).toEqual({ apply: false, nextSkip: true });
  });

  test("clears skip without applying once internal and URL modes match", () => {
    expect(
      shouldApplyExternalViewMode({
        skipInternal: true,
        internalMode: "compose",
        externalMode: "compose",
      })
    ).toEqual({ apply: false, nextSkip: false });
  });

  test("applies URL mode when skip is off (back / deep link)", () => {
    expect(
      shouldApplyExternalViewMode({
        skipInternal: false,
        internalMode: "review",
        externalMode: "compose",
      })
    ).toEqual({ apply: true, nextSkip: false });
  });

  test("does not apply when skip is off and modes already match", () => {
    expect(
      shouldApplyExternalViewMode({
        skipInternal: false,
        internalMode: "review",
        externalMode: "review",
      })
    ).toEqual({ apply: false, nextSkip: false });
  });

  test("does not apply when drafts alias already maps to compose", () => {
    expect(
      shouldApplyExternalViewMode({
        skipInternal: false,
        internalMode: "compose",
        externalMode: "compose",
      })
    ).toEqual({ apply: false, nextSkip: false });
  });
});

describe("urlModeToViewMode / viewModeToUrlMode", () => {
  test("maps respond, drafts, responses", () => {
    expect(urlModeToViewMode("respond")).toBe("compose");
    expect(urlModeToViewMode("drafts")).toBe("compose");
    expect(urlModeToViewMode("responses")).toBe("review");
    expect(urlModeToViewMode(null)).toBe("compose");
    expect(urlModeToViewMode("edit")).toBe("compose");
  });

  test("maps view modes back to URL", () => {
    expect(viewModeToUrlMode("compose")).toBe("respond");
    expect(viewModeToUrlMode("drafts")).toBe("respond");
    expect(viewModeToUrlMode("review")).toBe("responses");
  });
});

describe("shouldStartNewCompose", () => {
  test("작성 진입·재클릭은 칸 0으로 간다", () => {
    expect(shouldStartNewCompose({ targetMode: "compose" })).toBe(true);
    expect(shouldStartNewCompose({ targetMode: "drafts" })).toBe(true);
  });

  test("내 응답은 작성 칸을 바꾸지 않는다", () => {
    expect(shouldStartNewCompose({ targetMode: "review" })).toBe(false);
  });
});

describe("mergeRowDataForEdit", () => {
  test("keeps fallback when row data is empty", () => {
    expect(
      mergeRowDataForEdit({}, { text1: "조회 중 본문", file1: ["a"] })
    ).toEqual({ text1: "조회 중 본문", file1: ["a"] });
  });

  test("keeps fallback when row data is nullish", () => {
    expect(mergeRowDataForEdit(null, { text1: "본문" })).toEqual({
      text1: "본문",
    });
    expect(mergeRowDataForEdit(undefined, { text1: "본문" })).toEqual({
      text1: "본문",
    });
  });

  test("row fields override fallback", () => {
    expect(
      mergeRowDataForEdit(
        { text1: "저장본", extra: 1 },
        { text1: "조회 중 본문", file1: ["a"] }
      )
    ).toEqual({ text1: "저장본", extra: 1, file1: ["a"] });
  });
});

describe("copyRowDataForReuse", () => {
  test("keeps text and file answers", () => {
    const files = [{ key: "a.pdf", originalName: "a.pdf" }];
    expect(
      copyRowDataForReuse(
        { text1: "지난 활동 요약", file1: files },
        fields
      )
    ).toEqual({ text1: "지난 활동 요약", file1: files });
  });

  test("drops underscore system keys", () => {
    expect(
      copyRowDataForReuse(
        {
          text1: "본문",
          _quiz_score: 8,
          _quiz_total: 10,
          _assessment: { status: "finalized" },
        },
        fields
      )
    ).toEqual({ text1: "본문" });
  });

  test("keeps pick approvers and resets approval status", () => {
    expect(
      copyRowDataForReuse(
        {
          text1: "본문",
          appr1: {
            version: 2,
            overallStatus: "approved",
            status: "approved",
            currentStep: 0,
            steps: [
              {
                mode: "pick",
                label: "1차 승인",
                order: 0,
                approver: jo,
                status: "approved",
                actedAt: "2026-01-01",
              },
            ],
            circulation: [kim],
          },
        },
        fields
      )
    ).toMatchObject({
      text1: "본문",
      appr1: {
        version: 2,
        overallStatus: "pending",
        status: "pending",
        currentStep: 0,
        steps: [
          {
            mode: "pick",
            label: "1차 승인",
            approver: jo,
            status: "waiting",
          },
        ],
        circulation: [kim],
      },
    });
  });

  test("maps nested circulation onto a dedicated pick field", () => {
    const withCirc = [
      ...fields,
      {
        _id: "circ1",
        type: "circulation" as const,
        circulation: { mode: "pick" as const, users: [] },
      },
    ];
    const copied = copyRowDataForReuse(
      {
        appr1: {
          version: 2,
          steps: [{ mode: "pick", approver: jo }],
          circulation: [kim],
        },
      },
      withCirc
    );
    expect(copied.circ1).toEqual([kim]);
    expect(copied.appr1.circulation).toEqual([]);
    expect(copied.appr1.steps[0].approver).toEqual(jo);
  });

  test("drops aiChat session summaries", () => {
    expect(
      copyRowDataForReuse(
        {
          text1: "본문",
          chat1: { sessionId: "s1", studentMessageCount: 2, messageCount: 4 },
        },
        fields
      )
    ).toEqual({ text1: "본문" });
  });

  test("returns empty object for nullish data", () => {
    expect(copyRowDataForReuse(null, fields)).toEqual({});
    expect(copyRowDataForReuse(undefined, fields)).toEqual({});
  });
});

describe("filterReusedPickPeople", () => {
  test("drops pick people who are not in candidate sets", () => {
    const data = {
      appr1: {
        version: 2,
        steps: [
          { mode: "pick", approver: jo },
          { mode: "pick", approver: kim },
        ],
        circulation: [kim],
      },
    };
    const { data: next, dropped } = filterReusedPickPeople(data, fields, {
      approvalCandidateIds: ["jo"],
      circulationCandidateIds: [],
    });
    expect(next.appr1.steps[0].approver).toEqual(jo);
    expect(next.appr1.steps[1].approver).toBeUndefined();
    expect(next.appr1.circulation).toEqual([]);
    expect(dropped.map((d) => d.userId).sort()).toEqual(["kim", "kim"]);
  });

  test("formatReusedDroppedNotice lists unique names", () => {
    expect(formatReusedDroppedNotice([])).toBeNull();
    expect(
      formatReusedDroppedNotice([
        { userId: "kim", userName: "김민수", role: "approver" },
        { userId: "kim", userName: "김민수", role: "circulation" },
      ])
    ).toBe(
      "더 이상 지정할 수 없는 승인자·회람자는 제외했습니다. (김민수)"
    );
  });
});

describe("seedComposePickDefaults", () => {
  const pickFields = [
    {
      _id: "appr1",
      type: "approval" as const,
      approvalLine: {
        steps: [
          {
            order: 0,
            label: "1차 승인",
            mode: "pick" as const,
            approver: jo,
          },
          {
            order: 1,
            label: "2차 승인",
            mode: "fixed" as const,
            approver: kim,
          },
        ],
      },
    },
    {
      _id: "circ1",
      type: "circulation" as const,
      circulation: { mode: "pick" as const, users: [kim] },
    },
  ];

  test("fills pick defaults when keys are missing", () => {
    const { data, dropped } = seedComposePickDefaults({}, pickFields, {
      approvalCandidateIds: ["jo", "kim"],
      circulationCandidateIds: ["jo", "kim"],
    });
    expect(dropped).toEqual([]);
    expect(data.appr1.steps[0].approver).toEqual(jo);
    expect(data.appr1.steps[0].status).toBe("waiting");
    expect(data.appr1.steps[1].approver).toEqual(kim);
    expect(data.appr1.overallStatus).toBe("pending");
    expect(data.circ1).toEqual([kim]);
  });

  test("keeps empty pick and empty circulation instead of refilling", () => {
    const existing = {
      appr1: {
        version: 2,
        currentStep: 0,
        overallStatus: "pending",
        status: "pending",
        steps: [
          {
            order: 0,
            label: "1차 승인",
            mode: "pick",
            status: "waiting",
          },
        ],
      },
      circ1: [],
    };
    const { data, dropped } = seedComposePickDefaults(existing, pickFields, {
      approvalCandidateIds: ["jo", "kim"],
      circulationCandidateIds: ["jo", "kim"],
    });
    expect(dropped).toEqual([]);
    expect(data.appr1.steps[0].approver).toBeUndefined();
    expect(data.circ1).toEqual([]);
  });

  test("keeps reused pick people", () => {
    const reused = {
      appr1: {
        version: 2,
        steps: [
          {
            mode: "pick",
            approver: kim,
            status: "waiting",
          },
        ],
      },
      circ1: [jo],
    };
    const { data, dropped } = seedComposePickDefaults(reused, pickFields, {
      approvalCandidateIds: ["jo", "kim"],
      circulationCandidateIds: ["jo", "kim"],
    });
    expect(dropped).toEqual([]);
    expect(data.appr1.steps[0].approver).toEqual(kim);
    expect(data.circ1).toEqual([jo]);
  });

  test("drops ineligible defaults and leaves a notice list", () => {
    const { data, dropped } = seedComposePickDefaults({}, pickFields, {
      approvalCandidateIds: ["kim"],
      circulationCandidateIds: ["jo"],
    });
    expect(data.appr1.steps[0].approver).toBeUndefined();
    expect(data.appr1.steps[1].approver).toEqual(kim);
    expect(data.circ1).toEqual([]);
    expect(dropped.map((d) => d.userId).sort()).toEqual(["jo", "kim"]);
    expect(formatReusedDroppedNotice(dropped)).toBe(
      "더 이상 지정할 수 없는 승인자·회람자는 제외했습니다. (조은길, 김민수)"
    );
  });
});

describe("resolveFreshComposeData", () => {
  test("ignores local draft content so 작성 stays blank", () => {
    expect(
      resolveFreshComposeData({ localDraft: { text1: "진행 중" } })
    ).toEqual({});
  });

  test("returns empty object when there is no draft", () => {
    expect(resolveFreshComposeData({ localDraft: null })).toEqual({});
    expect(resolveFreshComposeData({ localDraft: undefined })).toEqual({});
    expect(resolveFreshComposeData({})).toEqual({});
    expect(resolveFreshComposeData()).toEqual({});
  });
});
