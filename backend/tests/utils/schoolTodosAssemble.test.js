import {
  assembleSchoolTodos,
  sortSchoolTodos,
} from "../../src/utils/schoolTodosAssemble.js";
import { zonedLocalToUtc } from "../../src/services/weekdaySchedule.js";

describe("sortSchoolTodos", () => {
  test("orders approve then grade then outgoing then unsubmitted; newest first within kind", () => {
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
        kind: "grade",
        formTitle: "g",
        submittedAt: "2026-02-15T00:00:00.000Z",
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
      "g",
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

  test("aggregates pending assessment rows into one grade todo per form", () => {
    const adminBoard = {
      _id: "boardGrade",
      name: "평가 보드",
      creator: { equals: () => false },
      altBoardRole: new Map([["user1", "admin"]]),
    };
    const formAssessment = {
      _id: "formGrade",
      board: "boardGrade",
      title: "평가 양식",
      fields: [],
      settings: { assessmentMode: true, requiredMode: false },
    };
    const formDirect = {
      _id: "formDirect",
      board: "boardGrade",
      title: "직접입력 평가",
      fields: [],
      settings: {
        assessmentMode: true,
        directInputMode: true,
        requiredMode: false,
      },
    };

    const items = assembleSchoolTodos({
      boards: [adminBoard],
      forms: [formAssessment, formDirect],
      myRows: [],
      approverRows: [],
      pendingGradeRows: [
        {
          form: "formGrade",
          _submittedAt: "2026-07-01T00:00:00.000Z",
        },
        {
          form: "formGrade",
          _submittedAt: "2026-07-10T00:00:00.000Z",
        },
        {
          form: "formDirect",
          _submittedAt: "2026-07-11T00:00:00.000Z",
        },
      ],
      user,
    });

    const gradeItems = items.filter((i) => i.kind === "grade");
    expect(gradeItems).toHaveLength(1);
    expect(gradeItems[0]).toMatchObject({
      kind: "grade",
      formTitle: "평가 양식",
      pendingCount: 2,
      progress: "2",
      assessmentMode: true,
      submittedAt: "2026-07-10T00:00:00.000Z",
    });
  });

  test("does not create grade todos for respondents", () => {
    const formAssessment = {
      _id: "formGrade2",
      board: "board1",
      title: "평가",
      fields: [],
      settings: { assessmentMode: true },
    };

    const items = assembleSchoolTodos({
      boards: [board],
      forms: [formAssessment],
      myRows: [],
      approverRows: [],
      pendingGradeRows: [
        { form: "formGrade2", _submittedAt: "2026-07-01T00:00:00.000Z" },
      ],
      user,
    });

    expect(items.filter((i) => i.kind === "grade")).toHaveLength(0);
  });

  test("weekdaySchedule: unsubmitted only inside occurrence window; closeAt is occurrence end", () => {
    const form = {
      _id: "formWeekday",
      board: "board1",
      title: "요일마다 양식",
      fields: [],
      settings: {
        requiredMode: true,
        allowMultipleResponses: true,
        requiredResponseCount: 10,
        openAt: "2026-03-01T00:00:00.000Z",
        closeAt: "2026-03-31T15:00:00.000Z",
        weekdaySchedule: {
          enabled: true,
          daysOfWeek: [3],
          startTime: "09:00",
          endTime: "18:00",
        },
      },
    };

    const inWindow = zonedLocalToUtc(2026, 3, 11, 10, 0);
    const outsideDay = zonedLocalToUtc(2026, 3, 10, 10, 0);

    const inside = assembleSchoolTodos({
      boards: [board],
      forms: [form],
      myRows: [],
      approverRows: [],
      user,
      now: inWindow,
    });
    const unsub = inside.find((i) => i.kind === "unsubmitted");
    expect(unsub?.formTitle).toBe("요일마다 양식");
    expect(new Date(unsub.closeAt).getTime()).toBe(
      zonedLocalToUtc(2026, 3, 11, 18, 0).getTime()
    );

    const outside = assembleSchoolTodos({
      boards: [board],
      forms: [form],
      myRows: [],
      approverRows: [],
      user,
      now: outsideDay,
    });
    expect(outside.filter((i) => i.kind === "unsubmitted")).toHaveLength(0);

    const submittedToday = assembleSchoolTodos({
      boards: [board],
      forms: [form],
      myRows: [
        {
          form: "formWeekday",
          createdAt: zonedLocalToUtc(2026, 3, 11, 9, 30),
        },
      ],
      approverRows: [],
      user,
      now: inWindow,
    });
    expect(
      submittedToday.filter((i) => i.kind === "unsubmitted")
    ).toHaveLength(0);
  });

  test("custom student members: teacher admin does not get unsubmitted todo", () => {
    const teacher = {
      _id: "admin1",
      userId: "t1",
      auth: "member",
    };
    const teacherBoard = {
      _id: "board1",
      name: "테스트 보드",
      creator: { equals: () => false },
      altBoardRole: new Map([["admin1", "admin"]]),
    };
    const studentOnlyForm = {
      _id: "formStudent",
      board: "board1",
      title: "학생만 제출",
      fields: [],
      settings: { requiredMode: true },
      members: {
        groups: { manager: false, teacher: false, student: true },
        users: [],
      },
    };
    const todos = assembleSchoolTodos({
      boards: [teacherBoard],
      forms: [studentOnlyForm],
      myRows: [],
      approverRows: [],
      user: teacher,
      schoolRole: "teacher",
    });
    expect(todos.filter((i) => i.kind === "unsubmitted")).toHaveLength(0);
  });
});
