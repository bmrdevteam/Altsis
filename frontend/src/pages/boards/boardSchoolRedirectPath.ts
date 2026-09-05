/**
 * Wrong-school deep link (e.g. /bmr/bmrhs/boards/id) → board's school.
 * Keeps query and hash. Returns null when no redirect is needed.
 */
export function boardSchoolRedirectPath({
  academyId,
  urlSchoolId,
  boardSchoolId,
  boardId,
  search = "",
  hash = "",
}: {
  academyId?: string | null;
  urlSchoolId?: string | null;
  boardSchoolId?: string | null;
  boardId?: string | null;
  search?: string;
  hash?: string;
}): string | null {
  const academy = typeof academyId === "string" ? academyId.trim() : "";
  const fromSchool = typeof urlSchoolId === "string" ? urlSchoolId.trim() : "";
  const toSchool =
    typeof boardSchoolId === "string" ? boardSchoolId.trim() : "";
  const id = typeof boardId === "string" ? boardId.trim() : "";
  if (!academy || !fromSchool || !toSchool || !id) return null;
  if (fromSchool === toSchool) return null;

  const q =
    !search || search === "?"
      ? ""
      : search.startsWith("?")
        ? search
        : `?${search}`;
  const h =
    !hash || hash === "#"
      ? ""
      : hash.startsWith("#")
        ? hash
        : `#${hash}`;
  return `/${academy}/${toSchool}/boards/${id}${q}${h}`;
}
