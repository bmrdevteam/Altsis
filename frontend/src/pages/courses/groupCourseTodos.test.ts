import { evaluationBySyllabusId } from "./groupCourseTodos";
import type { TCourseTodoItem } from "./courseTodosCache";

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
