import {
  countAttentionCourseTodos,
  evaluationBySyllabusId,
  isAttentionCourseTodo,
} from "./groupCourseTodos";
import type { TCourseTodoItem } from "./courseTodosCache";

const base = {
  syllabusId: "s1",
  syllabusTitle: "수업",
} as const;

describe("isAttentionCourseTodo / countAttentionCourseTodos", () => {
  test("평가중·승인만 조치 가능으로 센다", () => {
    expect(
      isAttentionCourseTodo({
        ...base,
        kind: "evaluation",
        surface: "mentoring",
        evalStatus: "평가중",
      })
    ).toBe(true);
    expect(
      isAttentionCourseTodo({
        ...base,
        kind: "evaluation",
        surface: "mentoring",
        evalStatus: "대기",
      })
    ).toBe(false);
    expect(
      isAttentionCourseTodo({
        ...base,
        kind: "evaluation",
        surface: "mentoring",
        evalStatus: "완료",
      })
    ).toBe(false);
    expect(
      isAttentionCourseTodo({
        ...base,
        kind: "approve",
        surface: "mentoring",
      })
    ).toBe(true);
  });

  test("surface별 syllabus 중복 없이 센다", () => {
    const items: TCourseTodoItem[] = [
      {
        kind: "evaluation",
        surface: "mentoring",
        syllabusId: "a",
        syllabusTitle: "A",
        evalStatus: "평가중",
      },
      {
        kind: "approve",
        surface: "mentoring",
        syllabusId: "a",
        syllabusTitle: "A",
      },
      {
        kind: "evaluation",
        surface: "mentoring",
        syllabusId: "b",
        syllabusTitle: "B",
        evalStatus: "대기",
      },
      {
        kind: "confirmPending",
        surface: "created",
        syllabusId: "c",
        syllabusTitle: "C",
      },
    ];
    expect(countAttentionCourseTodos(items, "mentoring")).toBe(1);
    expect(countAttentionCourseTodos(items, "created")).toBe(1);
    expect(countAttentionCourseTodos(items)).toBe(2);
  });
});

describe("evaluationBySyllabusId", () => {
  test("maps evalStatus labels", () => {
    const items: TCourseTodoItem[] = [
      {
        kind: "evaluation",
        surface: "mentoring",
        syllabusId: "s1",
        syllabusTitle: "A",
        evalStatus: "평가중",
      },
      {
        kind: "evaluation",
        surface: "enrolled",
        syllabusId: "e1",
        syllabusTitle: "B",
        evalStatus: "대기",
      },
      {
        kind: "evaluation",
        surface: "mentoring",
        syllabusId: "s2",
        syllabusTitle: "C",
        evalStatus: "없음",
      },
      {
        kind: "evaluation",
        surface: "mentoring",
        syllabusId: "s3",
        syllabusTitle: "D",
        evalStatus: "완료",
      },
    ];
    expect(evaluationBySyllabusId(items)).toEqual({
      s1: "평가중",
      e1: "대기",
      s2: "없음",
      s3: "완료",
    });
  });
});
