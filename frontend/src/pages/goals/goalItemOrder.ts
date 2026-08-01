/**
 * 학교 goalDisplay.itemOrder — ON 항목 표시 순서
 */

/** 저장된 순서 + 현재 활성 id를 합쳐 최종 순서를 만든다. 신규 활성 항목은 맨 뒤. */
export function syncItemOrder(
  stored: string[] | undefined | null,
  enabledIds: string[]
): string[] {
  const enabledSet = new Set(enabledIds);
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const id of stored || []) {
    if (!enabledSet.has(id) || seen.has(id)) continue;
    seen.add(id);
    kept.push(id);
  }
  for (const id of enabledIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    kept.push(id);
  }
  return kept;
}

/** itemOrder 기준으로 정렬. 순서에 없는 항목은 원래 상대 순서를 유지하며 뒤로. */
export function sortByItemOrder<T extends { id?: string }>(
  items: T[],
  order?: string[] | null
): T[] {
  if (!order || order.length === 0) return items;
  const rank = new Map(order.map((id, i) => [id, i]));
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aId = a.item.id;
      const bId = b.item.id;
      const ar = aId && rank.has(aId) ? (rank.get(aId) as number) : Number.POSITIVE_INFINITY;
      const br = bId && rank.has(bId) ? (rank.get(bId) as number) : Number.POSITIVE_INFINITY;
      if (ar !== br) return ar - br;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export function reorderIds(
  ids: string[],
  fromIndex: number,
  insertAt: number
): string[] {
  if (fromIndex < 0 || fromIndex >= ids.length) return ids;
  let to = Math.max(0, Math.min(insertAt, ids.length));
  if (fromIndex === to || fromIndex === to - 1) return ids;
  const next = [...ids];
  const [item] = next.splice(fromIndex, 1);
  if (fromIndex < to) to -= 1;
  next.splice(to, 0, item);
  return next;
}
