const normalizeQuery = (query: string): string => query.trim().toLowerCase();

export type TCheckFilter = "all" | "checked" | "unchecked";

/**
 * 검색어·체크 여부에 맞는 옵션 인덱스를 반환한다.
 * 빈 검색어면 이름 필터 없음. 순서는 검색 → 체크 여부.
 */
export const filterOptionIndices = (
  options: string[] | undefined,
  query: string,
  checkFilter: TCheckFilter = "all",
  selected: string[] = []
): number[] => {
  const list = Array.isArray(options) ? options : [];
  const q = normalizeQuery(query);
  const selectedSet = new Set(selected);
  const indices: number[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const label = String(list[i] ?? "");
    if (q && !label.toLowerCase().includes(q)) continue;
    const isChecked = selectedSet.has(label);
    if (checkFilter === "checked" && !isChecked) continue;
    if (checkFilter === "unchecked" && isChecked) continue;
    indices.push(i);
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
 * 검색·뱃지로 가려진 선택은 유지한다.
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
