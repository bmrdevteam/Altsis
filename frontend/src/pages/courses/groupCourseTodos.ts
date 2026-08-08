import type {
  TCourseTodoItem,
  TCourseTodoSurface,
  TEvalChipLabel,
} from "./courseTodosCache";

/**
 * Backend `assembleCourseTodos` count 와 동일:
 * - evaluation 은 「평가중」(기간 열림 + 미완료)만
 * - approve / confirmPending
 * 「대기」「없음」「완료」평가 행은 뱃지에서 제외.
 */
export function isAttentionCourseTodo(item: TCourseTodoItem): boolean {
  if (item.kind === "approve" || item.kind === "confirmPending") return true;
  if (item.kind === "evaluation" && item.evalStatus === "평가중") return true;
  return false;
}

/** surface별 조치 가능 할 일 수 (syllabus 중복 없이) */
export function countAttentionCourseTodos(
  items: TCourseTodoItem[],
  surface?: TCourseTodoSurface
): number {
  const ids = new Set<string>();
  for (const item of items) {
    if (surface && item.surface !== surface) continue;
    if (!isAttentionCourseTodo(item)) continue;
    if (item.syllabusId) ids.add(item.syllabusId);
  }
  return ids.size;
}

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
