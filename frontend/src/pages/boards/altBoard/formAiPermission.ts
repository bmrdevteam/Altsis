import { TSchool, TSchoolAiConfig } from "types/schools";
import { TAiSettings } from "types/seasons";

type SchoolLike = Pick<TSchool, "aiEnabled" | "academyFeatures" | "aiConfig">;
type SeasonLike = { aiSettings?: TAiSettings };

export const hasSchoolSkillConfig = (
  school?: Pick<SchoolLike, "aiConfig"> | null
) =>
  !!(
    school?.aiConfig?.skills &&
    typeof school.aiConfig.skills === "object" &&
    Object.keys(school.aiConfig.skills).length > 0
  );

export const resolveAiRolePermission = (
  school: Pick<SchoolLike, "aiConfig"> | null | undefined,
  season: SeasonLike | null | undefined,
  role: "teacher" | "student"
) => {
  const useSchoolPerm = hasSchoolSkillConfig(school);
  const schoolPerm = school?.aiConfig?.permission as
    | TSchoolAiConfig["permission"]
    | undefined;
  const seasonPerm = season?.aiSettings?.permission;
  if (role === "teacher") {
    return useSchoolPerm ? !!schoolPerm?.teacher : !!seasonPerm?.teacher;
  }
  return useSchoolPerm ? !!schoolPerm?.student : !!seasonPerm?.student;
};

/** 양식에 aiChat 항목을 추가할 수 있는지 (교사 AI 권한 + 인프라) */
export const canAuthorFormAiChat = (
  school?: SchoolLike | null,
  season?: SeasonLike | null
) => {
  if (school?.aiEnabled === false) return false;
  if (school?.academyFeatures?.aiEnabled === false) return false;
  if (!season?.aiSettings?.enabled) return false;
  return resolveAiRolePermission(school, season, "teacher");
};
