import { TAltFormField } from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import {
  approvalItemKey,
  approvalRowTitle,
  buildApprovalListItem,
  countApprovalInbox,
  formatWaitingLabel,
  isSelectableApprovalItem,
  matchesApprovalInboxFilter,
  nextMyTurnItem,
  pickApprovalField,
  resolveApprovalPrintRows,
  shouldDefaultInboxToAll,
  sortApprovalItems,
  waitingDaysFrom,
  waitingSinceIso,
} from "./sheetApprovalList";

const approverA = { user: "u1", userId: "jo", userName: "조은길" };
const approverB = { user: "u2", userId: "kim", userName: "김민수" };

const titleField = {
  _id: "title1",
  label: "제목",
  type: "text",
} as TAltFormField;

const shortField = {
  _id: "text1",
  label: "짧은 답변",
  type: "text",
} as TAltFormField;

const approvalField = {
  _id: "appr1",
  label: "결재선",
  type: "approval",
  approvalLine: {
    steps: [
      { order: 0, label: "1차 승인", mode: "fixed", approver: approverA },
      { order: 1, label: "2차 승인", mode: "fixed", approver: approverB },
    ],
  },
} as TAltFormField;

const otherApproval = {
  _id: "appr2",
  label: "추가 결재",
  type: "approval",
  approvalLine: {
    steps: [
      { order: 0, label: "전결", mode: "fixed", approver: approverB },
    ],
  },
} as TAltFormField;

const pendingValue = {
  version: 2 as const,
  currentStep: 0,
  overallStatus: "pending" as const,
  status: "pending",
  currentApproverUserId: "jo",
  steps: [
    {
      order: 0,
      label: "1차 승인",
      mode: "fixed" as const,
      approver: approverA,
      status: "pending" as const,
    },
    {
      order: 1,
      label: "2차 승인",
      mode: "fixed" as const,
      approver: approverB,
      status: "waiting" as const,
    },
  ],
};

const makeRow = (
  data: Record<string, unknown>,
  extra: Partial<TAltSheetRow> = {}
): TAltSheetRow =>
  ({
    _id: extra._id || "row1",
    sheet: "s1",
    form: "f1",
    board: "b1",
    _respondent: extra._respondent || "oid1",
    _respondentId: extra._respondentId || "student1",
    _respondentName: extra._respondentName || "학생",
    data,
    _submittedAt: extra._submittedAt || "2026-09-01T00:00:00.000Z",
    _updatedAt: "2026-09-01T00:00:00.000Z",
    isActive: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...extra,
  }) as TAltSheetRow;

describe("approvalRowTitle", () => {
  test("uses 제목 field first", () => {
    const row = makeRow({
      title1: "휴가 신청",
      text1: "짧은 내용",
    });
    expect(approvalRowTitle(row, [shortField, titleField, approvalField])).toBe(
      "휴가 신청"
    );
  });

  test("falls back to first text field", () => {
    const unlabeled = { ...titleField, label: "문서명" };
    const row = makeRow({ title1: "문서 제목" });
    expect(approvalRowTitle(row, [unlabeled, approvalField])).toBe("문서 제목");
  });

  test("falls back to respondent name", () => {
    const row = makeRow({}, { _respondentName: "조은길" });
    expect(approvalRowTitle(row, [approvalField])).toBe("조은길");
  });
});

describe("waitingSinceIso / waitingDaysFrom", () => {
  test("uses submittedAt on first step", () => {
    expect(waitingSinceIso(pendingValue, "2026-09-01T00:00:00.000Z")).toBe(
      "2026-09-01T00:00:00.000Z"
    );
  });

  test("uses previous step actedAt", () => {
    const mid = {
      ...pendingValue,
      currentStep: 1,
      currentApproverUserId: "kim",
      steps: [
        { ...pendingValue.steps[0], status: "approved" as const, actedAt: "2026-09-03T00:00:00.000Z" },
        { ...pendingValue.steps[1], status: "pending" as const },
      ],
    };
    expect(waitingSinceIso(mid, "2026-09-01T00:00:00.000Z")).toBe(
      "2026-09-03T00:00:00.000Z"
    );
  });

  test("counts whole days and treats invalid as 0", () => {
    const now = new Date("2026-09-05T12:00:00.000Z");
    expect(waitingDaysFrom("2026-09-02T12:00:00.000Z", now)).toBe(3);
    expect(waitingDaysFrom("not-a-date", now)).toBe(0);
    expect(waitingDaysFrom(undefined, now)).toBe(0);
    expect(formatWaitingLabel(0)).toBe("오늘");
    expect(formatWaitingLabel(3)).toBe("3일 대기");
  });
});

describe("pickApprovalField", () => {
  test("prefers the field the user can act on", () => {
    const row = makeRow({
      appr1: pendingValue,
      appr2: {
        version: 2,
        currentStep: 0,
        overallStatus: "pending",
        currentApproverUserId: "kim",
        steps: [
          {
            order: 0,
            label: "전결",
            mode: "fixed",
            approver: approverB,
            status: "pending",
          },
        ],
      },
    });
    expect(
      pickApprovalField([approvalField, otherApproval], row, "kim")?._id
    ).toBe("appr2");
    expect(
      pickApprovalField([approvalField, otherApproval], row, "jo")?._id
    ).toBe("appr1");
  });

  test("falls back to first approval field", () => {
    const row = makeRow({ appr1: pendingValue });
    expect(pickApprovalField([approvalField, otherApproval], row)?._id).toBe(
      "appr1"
    );
  });
});

describe("buildApprovalListItem / inbox filter", () => {
  const now = new Date("2026-09-05T00:00:00.000Z");

  test("marks my turn and selectable", () => {
    const row = makeRow({ title1: "신청서", appr1: pendingValue });
    const item = buildApprovalListItem(
      row,
      [titleField, approvalField],
      "jo",
      "oid-admin",
      now
    );
    expect(item?.title).toBe("신청서");
    expect(item?.isMyTurn).toBe(true);
    expect(item?.isMineSubmitted).toBe(false);
    expect(item && isSelectableApprovalItem(item)).toBe(true);
    expect(item && matchesApprovalInboxFilter(item, "mine")).toBe(true);
    expect(item && matchesApprovalInboxFilter(item, "pending")).toBe(true);
  });

  test("marks mine submitted by oid or userId", () => {
    const row = makeRow(
      { appr1: pendingValue },
      { _respondent: "oid1", _respondentId: "student1" }
    );
    const byOid = buildApprovalListItem(
      row,
      [approvalField],
      "other",
      "oid1",
      now
    );
    const byUserId = buildApprovalListItem(
      row,
      [approvalField],
      "student1",
      "other-oid",
      now
    );
    expect(byOid?.isMineSubmitted).toBe(true);
    expect(byUserId?.isMineSubmitted).toBe(true);
    expect(byOid && matchesApprovalInboxFilter(byOid, "mineSubmitted")).toBe(
      true
    );
  });

  test("counts inbox chips", () => {
    const mine = buildApprovalListItem(
      makeRow({ appr1: pendingValue }, { _id: "a" }),
      [approvalField],
      "jo",
      undefined,
      now
    );
    const approved = buildApprovalListItem(
      makeRow(
        {
          appr1: {
            ...pendingValue,
            overallStatus: "approved",
            currentStep: 1,
            steps: pendingValue.steps.map((s) => ({
              ...s,
              status: "approved" as const,
            })),
          },
        },
        { _id: "b" }
      ),
      [approvalField],
      "jo",
      undefined,
      now
    );
    const items = [mine, approved].filter(Boolean);
    const counts = countApprovalInbox(items as NonNullable<typeof mine>[]);
    expect(counts.mine).toBe(1);
    expect(counts.approved).toBe(1);
    expect(counts.all).toBe(2);
  });
});

describe("shouldDefaultInboxToAll", () => {
  test("defaults to all when mine is empty and others exist", () => {
    expect(shouldDefaultInboxToAll({ mine: 0, all: 7 })).toBe(true);
  });

  test("stays on mine when there is a waiting item", () => {
    expect(shouldDefaultInboxToAll({ mine: 1, all: 7 })).toBe(false);
  });

  test("does not switch when the list is empty", () => {
    expect(shouldDefaultInboxToAll({ mine: 0, all: 0 })).toBe(false);
  });
});

describe("sortApprovalItems / nextMyTurnItem", () => {
  const now = new Date("2026-09-05T00:00:00.000Z");
  const older = buildApprovalListItem(
    makeRow(
      { appr1: pendingValue },
      { _id: "old", _submittedAt: "2026-09-01T00:00:00.000Z" }
    ),
    [approvalField],
    "jo",
    undefined,
    now
  )!;
  const newer = buildApprovalListItem(
    makeRow(
      { appr1: pendingValue },
      { _id: "new", _submittedAt: "2026-09-04T00:00:00.000Z" }
    ),
    [approvalField],
    "jo",
    undefined,
    now
  )!;

  test("sorts by submitted desc by default", () => {
    expect(
      sortApprovalItems([older, newer], "submittedDesc").map((i) => i.rowId)
    ).toEqual(["new", "old"]);
  });

  test("sorts oldest waiting first", () => {
    expect(
      sortApprovalItems([newer, older], "waitingDesc").map((i) => i.rowId)
    ).toEqual(["old", "new"]);
  });

  test("returns next my-turn excluding current", () => {
    expect(nextMyTurnItem([older, newer], "old")?.rowId).toBe("new");
    expect(nextMyTurnItem([older], "old")).toBeNull();
  });
});

describe("resolveApprovalPrintRows", () => {
  const now = new Date("2026-09-05T00:00:00.000Z");
  const first = buildApprovalListItem(
    makeRow({ appr1: pendingValue }, { _id: "r1" }),
    [approvalField],
    "jo",
    undefined,
    now
  )!;
  const second = buildApprovalListItem(
    makeRow({ appr1: pendingValue }, { _id: "r2" }),
    [approvalField],
    "jo",
    undefined,
    now
  )!;

  test("uses visible list when nothing is checked", () => {
    const result = resolveApprovalPrintRows([first, second], new Set());
    expect(result.fromSelection).toBe(false);
    expect(result.rows.map((r) => r._id)).toEqual(["r1", "r2"]);
  });

  test("uses checked rows when selection exists", () => {
    const result = resolveApprovalPrintRows(
      [first, second],
      new Set([approvalItemKey(second)])
    );
    expect(result.fromSelection).toBe(true);
    expect(result.rows.map((r) => r._id)).toEqual(["r2"]);
  });

  test("prints rejected or others' rows even when not approvable", () => {
    const rejected = buildApprovalListItem(
      makeRow(
        {
          appr1: {
            ...pendingValue,
            overallStatus: "rejected",
            status: "rejected",
            steps: pendingValue.steps.map((s, i) => ({
              ...s,
              status: i === 0 ? ("rejected" as const) : s.status,
            })),
          },
        },
        { _id: "rej" }
      ),
      [approvalField],
      "jo",
      undefined,
      now
    )!;
    const others = buildApprovalListItem(
      makeRow({ appr1: pendingValue }, { _id: "oth" }),
      [approvalField],
      "kim",
      undefined,
      now
    )!;
    expect(isSelectableApprovalItem(rejected)).toBe(false);
    expect(isSelectableApprovalItem(others)).toBe(false);
    const result = resolveApprovalPrintRows(
      [rejected, others],
      new Set([approvalItemKey(rejected), approvalItemKey(others)])
    );
    expect(result.fromSelection).toBe(true);
    expect(result.rows.map((r) => r._id)).toEqual(["rej", "oth"]);
  });
});
