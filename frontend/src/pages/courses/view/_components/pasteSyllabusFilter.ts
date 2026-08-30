export const PASTE_FILTER_ALL = "__all__";

export type TPasteSyllabusRow = {
  year?: string;
  term?: string;
  classTitle?: string;
  userName?: string;
  subject?: string[];
};

export function uniqueYears(syllabuses: TPasteSyllabusRow[]): string[] {
  const years = Array.from(
    new Set(
      syllabuses
        .map((s) => s.year)
        .filter((year): year is string => Boolean(year))
    )
  );
  return years.sort((a, b) => b.localeCompare(a, "ko"));
}

export function uniqueTerms(
  syllabuses: TPasteSyllabusRow[],
  year: string
): string[] {
  const source = year ? syllabuses.filter((s) => s.year === year) : syllabuses;
  const terms = Array.from(
    new Set(
      source.map((s) => s.term).filter((term): term is string => Boolean(term))
    )
  );
  return terms.sort((a, b) => a.localeCompare(b, "ko"));
}

export function toSelectOptions(
  values: string[],
  extra?: string
): { text: string; value: string }[] {
  const list = extra && !values.includes(extra) ? [extra, ...values] : values;
  return [
    { text: "전체", value: PASTE_FILTER_ALL },
    ...list.map((value) => ({ text: value, value })),
  ];
}

export function filterPasteSyllabuses<T extends TPasteSyllabusRow>({
  syllabuses,
  year,
  term,
  keyword,
}: {
  syllabuses: T[];
  year: string;
  term: string;
  keyword: string;
}): T[] {
  const q = keyword.trim().toLowerCase();
  return syllabuses.filter((s) => {
    if (year && s.year !== year) return false;
    if (term && s.term !== term) return false;
    if (!q) return true;
    return [s.classTitle, s.userName, ...(s.subject || [])]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

export function formatPasteOwnerLabel(
  userName: string | undefined,
  ownerId: string | undefined,
  currentUserId: string | undefined
): string {
  const name = userName || "";
  if (!currentUserId || !ownerId) return name;
  if (String(ownerId) !== String(currentUserId)) return name;
  return name ? `${name} (나)` : "나";
}
