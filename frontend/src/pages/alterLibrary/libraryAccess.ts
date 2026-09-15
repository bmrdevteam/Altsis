import { canShowAlter } from "pages/boards/altBoard/formAiPermission";
import { TSchool } from "types/schools";
import { TAiSettings } from "types/seasons";
import { isSchoolManager, TSchoolManagerUser } from "utils/schoolManager";

export const isLibraryStaffAuth = (
  auth?: string | null,
  user?: TSchoolManagerUser,
  schoolId?: string
) => {
  if (user) return isSchoolManager(user, schoolId);
  return auth === "admin" || auth === "manager" || auth === "owner";
};

/** 도서관 페이지·Alter 헤더 진입 (해당 학교 관리자 또는 Alter 사용 가능한 교사) */
export const canAccessAlterLibrary = ({
  auth,
  role,
  school,
  season,
  userId,
  user,
}: {
  auth?: string | null;
  role?: string | null;
  school?: (Pick<TSchool, "aiEnabled" | "academyFeatures" | "aiConfig"> & {
    _id?: string;
  }) | null;
  season?: { aiSettings?: TAiSettings } | null;
  userId?: string | null;
  user?: TSchoolManagerUser;
}) => {
  if (isLibraryStaffAuth(auth, user, school?._id)) return true;
  if (role !== "teacher") return false;
  return canShowAlter(school, season, {
    role,
    auth,
    userId,
    user,
    schoolId: school?._id,
  });
};
