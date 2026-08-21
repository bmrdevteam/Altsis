export type TMemberIdentity = {
  userName: string;
  userId: string;
  role?: string;
  grade?: string;
  group?: string;
};

const ROLE_KO: Record<string, string> = {
  teacher: "교사",
  student: "학생",
};

/** `이름(아이디)[역할/학년/그룹]`. 빈 칸은 슬래시 없이 생략 */
export const formatMemberIdentity = (m: TMemberIdentity): string => {
  const role = ROLE_KO[m.role || ""] || "";
  const grade = String(m.grade || "").trim();
  const group = String(m.group || "").trim();
  const bracket = [role, grade, group].filter(Boolean).join("/");
  const name = `${m.userName}(${m.userId})`;
  return bracket ? `${name}[${bracket}]` : name;
};

export const memberMatchesQuery = (
  m: TMemberIdentity,
  query: string
): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return formatMemberIdentity(m).toLowerCase().includes(q);
};
