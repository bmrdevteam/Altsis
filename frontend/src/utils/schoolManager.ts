export type TSchoolAuth = "manager" | "member";

export type TSchoolMembership = {
  school?: string;
  schoolId?: string;
  schoolAuth?: TSchoolAuth;
};

export type TSchoolManagerUser = {
  auth?: string;
  schools?: TSchoolMembership[];
} | null | undefined;

export const resolveSchoolAuth = (
  requested: unknown,
  accountAuth?: string
): TSchoolAuth => {
  if (requested === "manager" || requested === "member") return requested;
  return accountAuth === "manager" ? "manager" : "member";
};

export const membershipMatchesSchool = (
  membership: TSchoolMembership | null | undefined,
  schoolRef: unknown
): boolean => {
  if (!membership || schoolRef == null || schoolRef === "") return false;
  const sid = String(schoolRef);
  return (
    (membership.school != null && String(membership.school) === sid) ||
    (membership.schoolId != null && String(membership.schoolId) === sid)
  );
};

export const findSchoolMembership = (
  user: TSchoolManagerUser,
  schoolRef: unknown
): TSchoolMembership | null => {
  if (!user?.schools?.length || schoolRef == null || schoolRef === "") {
    return null;
  }
  return (
    user.schools.find((row) => membershipMatchesSchool(row, schoolRef)) || null
  );
};

/**
 * 그 학교의 학교 관리자인지.
 * admin은 모든 학교. owner는 포함하지 않음.
 * schoolAuth 없음 + auth === "manager" 는 레거시로 그 소속 학교 관리자.
 */
export const isSchoolManager = (
  user: TSchoolManagerUser,
  schoolRef?: unknown
): boolean => {
  if (!user) return false;
  if (user.auth === "admin") return true;
  const membership = findSchoolMembership(user, schoolRef);
  if (!membership) return false;
  if (membership.schoolAuth === "manager") return true;
  if (membership.schoolAuth === "member") return false;
  return user.auth === "manager";
};

export const isSchoolManagerOf = (
  user: TSchoolManagerUser,
  ...schoolRefs: unknown[]
): boolean => {
  if (!user) return false;
  if (user.auth === "admin") return true;
  return schoolRefs.some((ref) => isSchoolManager(user, ref));
};

export const hasAnySchoolManagerRole = (user: TSchoolManagerUser): boolean => {
  if (!user) return false;
  if (user.auth === "admin") return true;
  if (!user.schools?.length) return false;
  return user.schools.some((row) =>
    isSchoolManager(user, row.school ?? row.schoolId)
  );
};

export const matchesManagerGroup = (
  user: TSchoolManagerUser,
  schoolRef?: unknown
): boolean => isSchoolManager(user, schoolRef);
