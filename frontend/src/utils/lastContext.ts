const SCHOOL_KEY = "altsis.lastSchool";
const REG_MAP_KEY = "altsis.lastRegistrationBySchool";

function safeGet(key: string): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  } catch {
    // quota / private mode
  }
}

function safeRemove(key: string) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function readRegMap(): Record<string, string> {
  const raw = safeGet(REG_MAP_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const map: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value) {
        map[String(key)] = value;
      }
    }
    return map;
  } catch {
    return {};
  }
}

export function rememberSchool(schoolId: string) {
  const id = String(schoolId || "");
  if (!id) return;
  safeSet(SCHOOL_KEY, id);
}

export function lastSchool(): string | null {
  const value = safeGet(SCHOOL_KEY);
  return value ? String(value) : null;
}

export function rememberRegistration(schoolId: string, registrationId: string) {
  const sid = String(schoolId || "");
  const rid = String(registrationId || "");
  if (!sid || !rid) return;
  const map = readRegMap();
  map[sid] = rid;
  safeSet(REG_MAP_KEY, JSON.stringify(map));
}

export function lastRegistrationFor(schoolId: string): string | null {
  const sid = String(schoolId || "");
  if (!sid) return null;
  return readRegMap()[sid] ?? null;
}

export function clearLastContext() {
  safeRemove(SCHOOL_KEY);
  safeRemove(REG_MAP_KEY);
}

export type TPeriodLike = {
  period?: {
    start?: string;
    end?: string;
  };
};

/** YYYY-MM-DD in local time */
export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Prefer the registration whose period contains `today`,
 * otherwise the one with the latest period.end.
 */
export function pickRegistration<T extends TPeriodLike>(
  registrations: T[],
  today = formatDateOnly(new Date())
): T | undefined {
  if (!registrations.length) return undefined;

  const inPeriod = registrations.find((reg) => {
    const start = reg.period?.start ?? "";
    const end = reg.period?.end ?? "";
    if (!start || !end) return false;
    return start <= today && today <= end;
  });
  if (inPeriod) return inPeriod;

  return [...registrations].sort((a, b) =>
    String(b.period?.end ?? "").localeCompare(String(a.period?.end ?? ""))
  )[0];
}

type TSchoolRef = {
  school: string;
  schoolId: string;
};

/**
 * Slug for home / login redirect:
 * current school → last stored school → first school on the user.
 */
export function homeSchoolId(
  currentUser?: { schools?: TSchoolRef[] } | null,
  currentSchool?: { schoolId?: string; _id?: string } | null
): string | undefined {
  if (currentSchool?.schoolId) return currentSchool.schoolId;

  const schools = currentUser?.schools ?? [];
  const saved = lastSchool();
  if (saved) {
    const match = schools.find(
      (s) => String(s.school) === saved || s.schoolId === saved
    );
    if (match?.schoolId) return match.schoolId;
  }

  return schools[0]?.schoolId;
}
