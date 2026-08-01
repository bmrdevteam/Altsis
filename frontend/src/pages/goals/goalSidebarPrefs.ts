/**
 * 사이드바 목표에 표시할 항목 id 목록 (학교·사용자별 localStorage)
 */

export type TGoalSidebarChip = {
  id: string;
  label: string;
  value: string;
  current?: number;
  total?: number;
  /** 남은 목표 수 (total - current) */
  remaining?: number;
  kind?: "enrolled" | "created" | "mentoring" | "archive" | "board" | "other";
  href: string;
};

const EVENT = "altsis:goals-sidebar-prefs";

export function goalSidebarPrefsKey(schoolId: string, userId: string) {
  return `goals.sidebarSelected:${schoolId}:${userId}`;
}

export function readSelectedGoalItemIds(
  schoolId: string,
  userId: string
): string[] | null {
  try {
    const raw = localStorage.getItem(goalSidebarPrefsKey(schoolId, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
}

export function writeSelectedGoalItemIds(
  schoolId: string,
  userId: string,
  ids: string[]
) {
  localStorage.setItem(
    goalSidebarPrefsKey(schoolId, userId),
    JSON.stringify(ids)
  );
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { schoolId, userId } }));
}

export function resolveSelectedIds(
  allIds: string[],
  stored: string[] | null
): string[] {
  if (!stored) return [...allIds];
  const allowed = new Set(allIds);
  return stored.filter((id) => allowed.has(id));
}

export function subscribeGoalSidebarPrefs(handler: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key && e.key.startsWith("goals.sidebarSelected:")) handler();
  };
  const onCustom = () => handler();
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onCustom);
  };
}
