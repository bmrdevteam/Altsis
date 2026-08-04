/**
 * 기록 화면에서 선택한 학생을 학기 단위로 유지 (항목 pid 이동·리마운트에도 복원)
 */

const STORAGE_PREFIX = "archive.selectedRegistrations";

function storageKey(seasonId: string) {
  return `${STORAGE_PREFIX}.${seasonId}`;
}

export function loadSelectedRegistrationIds(seasonId: string): string[] {
  if (!seasonId) return [];
  try {
    const raw = sessionStorage.getItem(storageKey(seasonId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String).filter(Boolean);
  } catch {
    return [];
  }
}

export function saveSelectedRegistrationIds(
  seasonId: string,
  ids: string[]
): void {
  if (!seasonId) return;
  try {
    sessionStorage.setItem(
      storageKey(seasonId),
      JSON.stringify(ids.map(String))
    );
  } catch {
    /* ignore quota / private mode */
  }
}
