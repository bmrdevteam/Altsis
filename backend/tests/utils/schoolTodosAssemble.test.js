import {
  assembleSchoolTodos,
  sortSchoolTodos,
} from "../../src/utils/schoolTodosAssemble.js";

describe("sortSchoolTodos", () => {
  test("orders approve then outgoing then unsubmitted; newest first within kind", () => {
    const sorted = sortSchoolTodos([
      {
        kind: "unsubmitted",
        formTitle: "u",
      },
      {
        kind: "approve",
        formTitle: "a-old",
        submittedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        kind: "outgoing",
        formTitle: "o",
        submittedAt: "2026-02-01T00:00:00.000Z",
      },
      {
        kind: "approve",
        formTitle: "a-new",
        submittedAt: "2026-03-01T00:00:00.000Z",
      },
    ]);
    expect(sorted.map((t) => t.formTitle)).toEqual([
      "a-new",
      "a-old",
      "o",
      "u",
    ]);
  });
});

describe("assembleSchoolTodos", () => {
  const user = {
    _id: "user1",
    userId: "approver1",
    auth: "member",
  };

  const board = {
    _id: "board1",
    name: "테스트 보드",
    creator: { equals: () => false },
    altBoardRole: new Map([["user1", "respondent"]]),
  };

  const approvalField = {
    _id: "fieldAppr",
    type: "approval",
    label: "승인",
    approvalLine: {
      steps: [{ order: 0, label: "1차 승인", mode: "pick" }],
    },
  };

  test("builds approve, outgoing, and unsubmitted kinds across boards", () => {
    const formApproval = {
      _id: "form1",
      board: "board1",
      title: "승인 양식",
      fields: [approvalField],
      settings: { requiredMode: false },
    };

    const formRequired = {
      _id: "form2",
      board: "board1",
      title: "필수 양식",
      fields: [],
      settings: { requiredMode: true },
    };

    const approverRows = [
      {
        _id: "row1",
        form: "form1",
        _respondentName: "홍길동",
        _respondentId: "s1",
        _submittedAt: "2026-07-01T00:00:00.000Z",
        data: {
          fieldAppr: {
            version: 2,
            overallStatus: "pending",
            currentStep: 0,
            currentApproverUserId: "approver1",
            steps: [
              {
                label: "1차 승인",
                status: "pending",
                approver: { userId: "approver1", userName: "승인자" },
              },
            ],
          },
        },
      },
    ];

    const myRows = [
      {
        _id: "row2",
        form: "form1",
        _submittedAt: "2026-06-01T00:00:00.000Z",
        data: {
          fieldAppr: {
            version: 2,
            overallStatus: "pending",
            currentStep: 0,
            currentApproverUserId: "other",
            steps: [
              {
                label: "1차 승인",
                status: "pending",
                approver: { userId: "other", userName: "다른이" },
              },
            ],
          },
        },
      },
    ];

    const items = assembleSchoolTodos({
      boards: [board],
      forms: [formApproval, formRequired],
      myRows,
      approverRows,
      user,
      now: new Date("2026-07-20T00:00:00.000Z"),
    });

    const kinds = items.map((i) => i.kind);
    expect(kinds).toContain("approve");
    expect(kinds).toContain("outgoing");
    expect(kinds).toContain("unsubmitted");
    expect(kinds[0]).toBe("approve");
    expect(items.find((i) => i.kind === "unsubmitted")?.formTitle).toBe(
      "필수 양식"
    );
    const unsub = items.find((i) => i.kind === "unsubmitted");
    expect(unsub).toMatchObject({
      quizMode: false,
      assessmentMode: false,
    });
    expect(unsub).toHaveProperty("closeAt");
  });

  test("skips unsubmitted when user has no alt board role", () => {
    const boardNoRole = {
      _id: "board2",
      name: "빈 보드",
      creator: { equals: () => false },
      altBoardRole: new Map(),
    };
    const formRequired = {
      _id: "form3",
      board: "board2",
      title: "필수",
      fields: [],
      settings: { requiredMode: true },
    };

    const items = assembleSchoolTodos({
      boards: [boardNoRole],
      forms: [formRequired],
      myRows: [],
      approverRows: [],
      user: { _id: "x", userId: "x", auth: "member" },
    });

    expect(items).toEqual([]);
  });
});
