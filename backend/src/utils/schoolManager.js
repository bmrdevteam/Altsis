/**
 * 학교별 학교 관리자 판정.
 * 계정 등급 user.auth는 바꾸지 않고, 소속 한 줄(schoolAuth)로 그 학교 관리 여부를 둔다.
 */

const SCHOOL_AUTH = new Set(["manager", "member"]);

/**
 * 요청된 schoolAuth를 정규화한다.
 * 없거나 잘못된 값이면 계정 auth === "manager"일 때 manager, 아니면 member.
 *
 * @param {unknown} requested
 * @param {string} [accountAuth]
 * @returns {"manager"|"member"}
 */
export const resolveSchoolAuth = (requested, accountAuth) => {
  if (requested === "manager" || requested === "member") return requested;
  return accountAuth === "manager" ? "manager" : "member";
};

/**
 * 소속 항목이 주어진 학교 참조와 같은지.
 * school(ObjectId) 또는 schoolId(문자열) 모두 허용.
 *
 * @param {{ school?: unknown, schoolId?: unknown } | null | undefined} membership
 * @param {unknown} schoolRef
 * @returns {boolean}
 */
export const membershipMatchesSchool = (membership, schoolRef) => {
  if (!membership || schoolRef == null || schoolRef === "") return false;
  const sid = String(schoolRef);
  return (
    (membership.school != null && String(membership.school) === sid) ||
    (membership.schoolId != null && String(membership.schoolId) === sid)
  );
};

/**
 * user.schools에서 해당 학교 소속 한 줄.
 *
 * @param {{ schools?: Array<{ school?: unknown, schoolId?: unknown, schoolAuth?: string }> } | null | undefined} user
 * @param {unknown} schoolRef
 * @returns {object | null}
 */
export const findSchoolMembership = (user, schoolRef) => {
  if (!user?.schools?.length || schoolRef == null || schoolRef === "") {
    return null;
  }
  return (
    user.schools.find((row) => membershipMatchesSchool(row, schoolRef)) || null
  );
};

/**
 * 그 학교의 학교 관리자인지.
 *
 * - auth === "admin" → 모든 학교
 * - 소속 schoolAuth === "manager" → 그 학교
 * - schoolAuth === "member" → 아님 (계정 auth가 manager여도)
 * - schoolAuth 없음 + auth === "manager" → 그 소속 학교는 관리자 (레거시)
 * - 소속에 없는 학교 → 아님
 * - owner는 포함하지 않음
 *
 * @param {{ auth?: string, schools?: Array<{ school?: unknown, schoolId?: unknown, schoolAuth?: string }> } | null | undefined} user
 * @param {unknown} schoolRef
 * @returns {boolean}
 */
export const isSchoolManager = (user, schoolRef) => {
  if (!user) return false;
  if (user.auth === "admin") return true;
  const membership = findSchoolMembership(user, schoolRef);
  if (!membership) return false;
  if (membership.schoolAuth === "manager") return true;
  if (membership.schoolAuth === "member") return false;
  return user.auth === "manager";
};

/**
 * 자원의 학교 필드 중 하나라도 맞으면 그 학교 관리자.
 * admin은 schoolRef가 없어도 true.
 *
 * @param {object | null | undefined} user
 * @param {...unknown} schoolRefs
 * @returns {boolean}
 */
export const isSchoolManagerOf = (user, ...schoolRefs) => {
  if (!user) return false;
  if (user.auth === "admin") return true;
  return schoolRefs.some((ref) => isSchoolManager(user, ref));
};

/**
 * 관리 API 입구: 어느 학교든 학교 관리자이거나 아카데미 관리자.
 * 멤버(모든 소속이 member)는 false. 레거시 manager(schoolAuth 없음)는 true.
 *
 * @param {{ auth?: string, schools?: Array<{ school?: unknown, schoolId?: unknown, schoolAuth?: string }> } | null | undefined} user
 * @returns {boolean}
 */
export const hasAnySchoolManagerRole = (user) => {
  if (!user) return false;
  if (user.auth === "admin") return true;
  if (!user.schools?.length) return false;
  return user.schools.some((row) =>
    isSchoolManager(user, row.school ?? row.schoolId)
  );
};

/**
 * 그룹 「관리자」(members.groups.manager, type: manager) 매칭.
 *
 * @param {object | null | undefined} user
 * @param {unknown} schoolRef
 * @returns {boolean}
 */
export const matchesManagerGroup = (user, schoolRef) =>
  isSchoolManager(user, schoolRef);

export { SCHOOL_AUTH };
