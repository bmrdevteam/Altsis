import {
  DEFAULT_GOAL_DISPLAY,
  mergeGoalDisplay,
  sanitizeGoalDisplay,
} from "../../src/constants/defaultGoalDisplay.js";
import {
  archiveLabelCount,
  ownArchiveLabels,
} from "../../src/utils/goalArchiveCounts.js";
import {
  countRequiredFormProgress,
  listRequiredFormProgress,
} from "../../src/utils/requiredFormProgress.js";

describe("mergeGoalDisplay", () => {
  test("falls back to defaults when goalForm-era / empty", () => {
    expect(mergeGoalDisplay(null)).toEqual(DEFAULT_GOAL_DISPLAY);
    expect(mergeGoalDisplay(undefined)).toEqual(DEFAULT_GOAL_DISPLAY);
    expect(mergeGoalDisplay({})).toEqual(DEFAULT_GOAL_DISPLAY);
  });

  test("merges partial role toggles", () => {
    const merged = mergeGoalDisplay({
      student: { board: false },
      teacher: { enrolled: false, mentoring: false },
    });
    expect(merged.student.enrolled).toBe(true);
    expect(merged.student.archive).toBe(true);
    expect(merged.student.board).toBe(false);
    expect(merged.student.items).toEqual({});
    expect(merged.teacher.enrolled).toBe(false);
    expect(merged.teacher.created).toBe(true);
    expect(merged.teacher.mentoring).toBe(false);
  });

  test("merges item-level toggles + targets", () => {
    const merged = mergeGoalDisplay({
      student: {
        items: {
          "enrolled:총 학점": false,
          "board:전체 할 일": true,
          "enrolled:주간 수업 시수": { enabled: true, target: 20 },
        },
      },
    });
    expect(merged.student.items["enrolled:총 학점"]).toBe(false);
    expect(merged.student.items["board:전체 할 일"]).toBe(true);
    expect(merged.student.items["enrolled:주간 수업 시수"]).toEqual({
      enabled: true,
      target: 20,
    });
    expect(merged.teacher.items).toEqual({});
    expect(merged.student.itemOrder).toEqual([]);
    expect(merged.teacher.itemOrder).toEqual([]);
  });

  test("merges itemOrder and drops invalid/duplicate ids", () => {
    const merged = mergeGoalDisplay({
      teacher: {
        itemOrder: [
          "mentoring:자기평가",
          "",
          "board:전체 할 일",
          "mentoring:자기평가",
          12,
          "created:개설 수업",
        ],
      },
    });
    expect(merged.teacher.itemOrder).toEqual([
      "mentoring:자기평가",
      "board:전체 할 일",
      "created:개설 수업",
    ]);
    expect(merged.student.itemOrder).toEqual([]);
  });
});

describe("sanitizeGoalDisplay", () => {
  test("rejects non-objects", () => {
    expect(sanitizeGoalDisplay(null)).toBeNull();
    expect(sanitizeGoalDisplay("x")).toBeNull();
  });

  test("returns merged object for valid input", () => {
    const result = sanitizeGoalDisplay({ student: { archive: false } });
    expect(result.student.archive).toBe(false);
    expect(result.teacher.board).toBe(true);
  });
});

describe("archiveLabelCount", () => {
  test("array → length; object → 0/1; missing → 0", () => {
    expect(archiveLabelCount({}, "봉사", "array")).toBe(0);
    expect(archiveLabelCount({ 봉사: [{ a: 1 }, { a: 2 }] }, "봉사", "array")).toBe(
      2
    );
    expect(archiveLabelCount({ 봉사: {} }, "봉사", "object")).toBe(0);
    expect(archiveLabelCount({ 봉사: { 시간: "2" } }, "봉사", "object")).toBe(1);
    expect(archiveLabelCount(null, "봉사", "object")).toBe(0);
  });
});

describe("ownArchiveLabels", () => {
  test("keeps authStudent view/viewAndEdit only", () => {
    const labels = ownArchiveLabels([
      { label: "A", authStudent: "view" },
      { label: "B", authStudent: "undefined" },
      { label: "C", authStudent: "viewAndEdit" },
      { label: "D" },
    ]);
    expect(labels.map((l) => l.label)).toEqual(["A", "C"]);
  });
});

describe("countRequiredFormProgress", () => {
  const user = {
    _id: "user1",
    userId: "u1",
    auth: "member",
  };

  const board = {
    _id: "board1",
    name: "보드",
    creator: { equals: () => false },
    altBoardRole: new Map([["user1", "respondent"]]),
  };

  const now = new Date("2026-06-01T00:00:00.000Z");

  test("counts required forms in window; submitted vs total", () => {
    const forms = [
      {
        _id: "f1",
        board: "board1",
        title: "필수1",
        settings: { requiredMode: true },
      },
      {
        _id: "f2",
        board: "board1",
        title: "필수2-제출됨",
        settings: { requiredMode: true },
      },
      {
        _id: "f3",
        board: "board1",
        title: "선택",
        settings: { requiredMode: false },
      },
      {
        _id: "f4",
        board: "board1",
        title: "마감",
        settings: {
          requiredMode: true,
          closeAt: "2026-01-01T00:00:00.000Z",
        },
      },
      {
        _id: "f5",
        board: "board1",
        title: "직접입력",
        settings: { requiredMode: true, directInputMode: true },
      },
    ];

    const myRows = [
      {
        _id: "r1",
        form: "f2",
        _submittedAt: "2026-05-01T00:00:00.000Z",
      },
    ];

    const result = countRequiredFormProgress({
      boards: [board],
      forms,
      myRows,
      user,
      now,
    });

    expect(result).toEqual({ submitted: 1, total: 2 });
  });

  test("draft sheet rows do not count as submitted progress", () => {
    const forms = [
      {
        _id: "f1",
        board: "board1",
        title: "필수1",
        settings: { requiredMode: true },
      },
    ];
    const result = countRequiredFormProgress({
      boards: [board],
      forms,
      myRows: [{ _id: "d1", form: "f1", isDraft: true }],
      user,
      now,
    });
    expect(result).toEqual({ submitted: 0, total: 1 });
  });

  test("listRequiredFormProgress includes per-form submitted/required", () => {
    const forms = [
      {
        _id: "f1",
        board: "board1",
        title: "필수1",
        settings: { requiredMode: true },
      },
      {
        _id: "f2",
        board: "board1",
        title: "필수2-복수",
        settings: {
          requiredMode: true,
          allowMultipleResponses: true,
          requiredResponseCount: 3,
        },
      },
    ];
    const myRows = [
      { form: "f2", _submittedAt: "2026-05-01T00:00:00.000Z" },
      { form: "f2", _submittedAt: "2026-05-02T00:00:00.000Z" },
    ];
    const result = listRequiredFormProgress({
      boards: [board],
      forms,
      myRows,
      user,
      now,
    });
    expect(result.submitted).toBe(0);
    expect(result.total).toBe(2);
    expect(result.forms).toEqual([
      {
        formId: "f1",
        boardId: "board1",
        title: "필수1",
        submitted: 0,
        required: 1,
      },
      {
        formId: "f2",
        boardId: "board1",
        title: "필수2-복수",
        submitted: 2,
        required: 3,
      },
    ]);
  });

  test("skips required forms when user is not a respondent", () => {
    const teacher = {
      _id: "tea1",
      userId: "t1",
      auth: "member",
    };
    const teacherBoard = {
      _id: "board1",
      name: "보드",
      creator: { equals: () => false },
      altBoardRole: new Map([["tea1", "admin"]]),
    };
    const forms = [
      {
        _id: "f1",
        board: "board1",
        title: "학생만",
        settings: { requiredMode: true },
        members: {
          groups: { manager: false, teacher: false, student: true },
          users: [],
        },
      },
    ];
    const result = countRequiredFormProgress({
      boards: [teacherBoard],
      forms,
      myRows: [],
      user: teacher,
      now,
      schoolRole: "teacher",
    });
    expect(result).toEqual({ submitted: 0, total: 0 });
  });

  const checkboxFields = (ids, extra = []) => [
    ...ids.map((id) => ({ _id: id, type: "checkbox", label: id })),
    ...extra,
  ];

  test("optional form with several checkboxes reports checked/total", () => {
    const forms = [
      {
        _id: "bible",
        board: "board1",
        title: "통독표",
        settings: { requiredMode: false },
        fields: checkboxFields(["c1", "c2", "c3", "c4", "c5"]),
      },
    ];
    const result = listRequiredFormProgress({
      boards: [board],
      forms,
      myRows: [
        {
          form: "bible",
          _submittedAt: "2026-05-01T00:00:00.000Z",
          data: { c1: true, c2: true, c3: true, c4: false },
        },
      ],
      user,
      now,
    });
    expect(result).toEqual({
      submitted: 0,
      total: 0,
      forms: [
        {
          formId: "bible",
          boardId: "board1",
          title: "통독표",
          submitted: 3,
          required: 5,
        },
      ],
    });
  });

  test("required form without checkboxes stays submission 0/1", () => {
    const forms = [
      {
        _id: "f1",
        board: "board1",
        title: "필수1",
        settings: { requiredMode: true },
        fields: [{ _id: "t1", type: "text", label: "이름" }],
      },
    ];
    const result = listRequiredFormProgress({
      boards: [board],
      forms,
      myRows: [],
      user,
      now,
    });
    expect(result.submitted).toBe(0);
    expect(result.total).toBe(1);
    expect(result.forms).toEqual([
      {
        formId: "f1",
        boardId: "board1",
        title: "필수1",
        submitted: 0,
        required: 1,
      },
    ]);
  });

  test("optional checkbox form is not in 전체 할 일 totals", () => {
    const forms = [
      {
        _id: "req",
        board: "board1",
        title: "필수",
        settings: { requiredMode: true },
      },
      {
        _id: "opt",
        board: "board1",
        title: "선택 통독",
        settings: { requiredMode: false },
        fields: checkboxFields(["a", "b", "c"]),
      },
    ];
    const counted = countRequiredFormProgress({
      boards: [board],
      forms,
      myRows: [],
      user,
      now,
    });
    const listed = listRequiredFormProgress({
      boards: [board],
      forms,
      myRows: [],
      user,
      now,
    });
    expect(counted).toEqual({ submitted: 0, total: 1 });
    expect(listed.forms.map((f) => f.formId)).toEqual(["req", "opt"]);
    expect(listed.forms.find((f) => f.formId === "opt")).toEqual({
      formId: "opt",
      boardId: "board1",
      title: "선택 통독",
      submitted: 0,
      required: 3,
    });
  });

  test("multiple responses union checked checkbox ids", () => {
    const forms = [
      {
        _id: "bible",
        board: "board1",
        title: "통독표",
        settings: { allowMultipleResponses: true },
        fields: checkboxFields(["c1", "c2", "c3", "c4"]),
      },
    ];
    const result = listRequiredFormProgress({
      boards: [board],
      forms,
      myRows: [
        {
          form: "bible",
          _submittedAt: "2026-05-01T00:00:00.000Z",
          data: { c1: true, c2: false },
        },
        {
          form: "bible",
          _submittedAt: "2026-05-10T00:00:00.000Z",
          data: { c2: true, c3: true },
        },
      ],
      user,
      now,
    });
    expect(result.forms).toEqual([
      {
        formId: "bible",
        boardId: "board1",
        title: "통독표",
        submitted: 3,
        required: 4,
      },
    ]);
  });

  test("closed checkbox form still appears in forms", () => {
    const forms = [
      {
        _id: "bible",
        board: "board1",
        title: "통독표",
        settings: {
          requiredMode: false,
          closeAt: "2026-01-01T00:00:00.000Z",
        },
        fields: checkboxFields(["c1", "c2"]),
      },
    ];
    const result = listRequiredFormProgress({
      boards: [board],
      forms,
      myRows: [
        {
          form: "bible",
          _submittedAt: "2025-12-01T00:00:00.000Z",
          data: { c1: true },
        },
      ],
      user,
      now,
    });
    expect(result.total).toBe(0);
    expect(result.forms).toEqual([
      {
        formId: "bible",
        boardId: "board1",
        title: "통독표",
        submitted: 1,
        required: 2,
      },
    ]);
  });

  test("owner-only checkboxes are excluded from the denominator", () => {
    const forms = [
      {
        _id: "bible",
        board: "board1",
        title: "통독표",
        fields: checkboxFields(
          ["c1", "c2", "c3"],
          [{ _id: "ownerBox", type: "checkbox", permission: "owner" }]
        ),
      },
    ];
    const result = listRequiredFormProgress({
      boards: [board],
      forms,
      myRows: [
        {
          form: "bible",
          _submittedAt: "2026-05-01T00:00:00.000Z",
          data: { c1: true, ownerBox: true },
        },
      ],
      user,
      now,
    });
    expect(result.forms).toEqual([
      {
        formId: "bible",
        boardId: "board1",
        title: "통독표",
        submitted: 1,
        required: 3,
      },
    ]);
  });

  test("single-response form uses the latest submission only", () => {
    const forms = [
      {
        _id: "bible",
        board: "board1",
        title: "통독표",
        settings: { allowMultipleResponses: false },
        fields: checkboxFields(["c1", "c2", "c3"]),
      },
    ];
    const result = listRequiredFormProgress({
      boards: [board],
      forms,
      myRows: [
        {
          form: "bible",
          _submittedAt: "2026-05-01T00:00:00.000Z",
          data: { c1: true, c2: true },
        },
        {
          form: "bible",
          _submittedAt: "2026-05-10T00:00:00.000Z",
          data: { c3: true },
        },
      ],
      user,
      now,
    });
    expect(result.forms[0]).toMatchObject({ submitted: 1, required: 3 });
  });

  test("checkbox progress is hidden before openAt", () => {
    const forms = [
      {
        _id: "bible",
        board: "board1",
        title: "통독표",
        settings: { openAt: "2026-12-01T00:00:00.000Z" },
        fields: checkboxFields(["c1", "c2"]),
      },
    ];
    const result = listRequiredFormProgress({
      boards: [board],
      forms,
      myRows: [],
      user,
      now,
    });
    expect(result.forms).toEqual([]);
  });

  test("optional multiSelect (양식 도구 체크박스) counts selected options", () => {
    const forms = [
      {
        _id: "bible",
        board: "board1",
        title: "통독표",
        settings: { requiredMode: false },
        fields: [
          {
            _id: "chapters",
            type: "multiSelect",
            options: ["창1", "창2", "출1", "출2", "출3"],
          },
        ],
      },
    ];
    const result = listRequiredFormProgress({
      boards: [board],
      forms,
      myRows: [
        {
          form: "bible",
          _submittedAt: "2026-05-01T00:00:00.000Z",
          data: { chapters: ["창1", "출1", "출3"] },
        },
      ],
      user,
      now,
    });
    expect(result).toEqual({
      submitted: 0,
      total: 0,
      forms: [
        {
          formId: "bible",
          boardId: "board1",
          title: "통독표",
          submitted: 3,
          required: 5,
        },
      ],
    });
  });

  test("multiple multiSelect fields sum options; owner multiSelect is excluded", () => {
    const forms = [
      {
        _id: "bible",
        board: "board1",
        title: "통독표",
        fields: [
          { _id: "a", type: "multiSelect", options: ["1", "2"] },
          { _id: "b", type: "multiSelect", options: ["3", "4"] },
          {
            _id: "staff",
            type: "multiSelect",
            permission: "owner",
            options: ["x", "y"],
          },
        ],
      },
    ];
    const result = listRequiredFormProgress({
      boards: [board],
      forms,
      myRows: [
        {
          form: "bible",
          _submittedAt: "2026-05-01T00:00:00.000Z",
          data: { a: ["1"], b: ["3", "4"], staff: ["x"] },
        },
      ],
      user,
      now,
    });
    expect(result.forms[0]).toMatchObject({ submitted: 3, required: 4 });
  });

  test("multiSelect multiple responses union selected options", () => {
    const forms = [
      {
        _id: "bible",
        board: "board1",
        title: "통독표",
        settings: { allowMultipleResponses: true },
        fields: [
          {
            _id: "chapters",
            type: "multiSelect",
            options: ["a", "b", "c", "d"],
          },
        ],
      },
    ];
    const result = listRequiredFormProgress({
      boards: [board],
      forms,
      myRows: [
        {
          form: "bible",
          _submittedAt: "2026-05-01T00:00:00.000Z",
          data: { chapters: ["a"] },
        },
        {
          form: "bible",
          _submittedAt: "2026-05-10T00:00:00.000Z",
          data: { chapters: ["b", "c"] },
        },
      ],
      user,
      now,
    });
    expect(result.forms[0]).toMatchObject({ submitted: 3, required: 4 });
  });

  test("required form with many checkboxes uses checkbox counts on the form line", () => {
    const forms = [
      {
        _id: "bible",
        board: "board1",
        title: "필수 통독",
        settings: { requiredMode: true },
        fields: checkboxFields(["c1", "c2", "c3"]),
      },
    ];
    const result = listRequiredFormProgress({
      boards: [board],
      forms,
      myRows: [
        {
          form: "bible",
          _submittedAt: "2026-05-01T00:00:00.000Z",
          data: { c1: true, c2: true },
        },
      ],
      user,
      now,
    });
    expect(result.submitted).toBe(1);
    expect(result.total).toBe(1);
    expect(result.forms[0]).toEqual({
      formId: "bible",
      boardId: "board1",
      title: "필수 통독",
      submitted: 2,
      required: 3,
    });
  });
});
