import { isSchoolManager, TSchoolManagerUser } from "utils/schoolManager";

type TQueryUser = TSchoolManagerUser & { _id?: string };

/**
 * 담당 수업 목록 쿼리.
 * 학교 관리자·아카데미 관리자는 그 학기의 모든 수업을 평가 대상으로 본다.
 */
export const mentoringSyllabusQuery = (
  user: TQueryUser,
  seasonId: string,
  schoolRef?: unknown
): { season: string; teacher?: string } => {
  if (isSchoolManager(user, schoolRef)) {
    return { season: seasonId };
  }
  return { season: seasonId, teacher: user?._id };
};
