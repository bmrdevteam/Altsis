import type { TCourseTodoItem, TEvalChipLabel } from "./courseTodosCache";

/**
 * Syllabus → 「평가」 chip label (없음 | 대기 | 평가중 | 완료).
 */
export function evaluationBySyllabusId(
  items: TCourseTodoItem[]
): Record<string, TEvalChipLabel> {
  const map: Record<string, TEvalChipLabel> = {};
  const rank: Record<TEvalChipLabel, number> = {
    평가중: 0,
    대기: 1,
    없음: 2,
    완료: 3,
  };
  for (const item of items) {
    if (item.kind !== "evaluation" || !item.syllabusId) continue;
    let label = item.evalStatus;
    if (!label) {
      // legacy fallback
      label = item.periodOpen === false ? "대기" : "평가중";
    }
    const prev = map[item.syllabusId];
    if (prev == null || rank[label] < rank[prev]) {
      map[item.syllabusId] = label;
    }
  }
  return map;
}
