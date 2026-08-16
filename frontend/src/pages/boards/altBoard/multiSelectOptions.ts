const normalizeQuery = (query: string): string => query.trim().toLowerCase();

/**
 * 검색어에 맞는 옵션 인덱스를 반환한다. 빈 검색어면 전체.
 * 대소문자를 구분하지 않는다.
 */
export const filterOptionIndices = (
  options: string[] | undefined,
  query: string
): number[] => {
  const list = Array.isArray(options) ? options : [];
  const q = normalizeQuery(query);
  const indices: number[] = [];
  for (let i = 0; i < list.length; i += 1) {
    if (!q || String(list[i] ?? "").toLowerCase().includes(q)) {
      indices.push(i);
    }
  }
  return indices;
};

export const isAllVisibleSelected = (
  selected: string[],
  visibleOptions: string[]
): boolean =>
  visibleOptions.length > 0 &&
  visibleOptions.every((opt) => selected.includes(opt));

/**
 * 보이는 항목을 모두 선택하거나, 이미 모두 선택돼 있으면 그 범위만 해제한다.
 * 검색으로 가려진 선택은 유지한다.
 */
export const toggleSelectAllVisible = (
  selected: string[],
  visibleOptions: string[]
): string[] => {
  if (visibleOptions.length === 0) return selected;
  const visibleSet = new Set(visibleOptions);
  if (isAllVisibleSelected(selected, visibleOptions)) {
    return selected.filter((s) => !visibleSet.has(s));
  }
  const next = new Set(selected);
  visibleOptions.forEach((opt) => next.add(opt));
  return Array.from(next);
};
