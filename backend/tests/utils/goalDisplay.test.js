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
});
