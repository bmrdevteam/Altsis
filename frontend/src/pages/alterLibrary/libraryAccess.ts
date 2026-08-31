import { canShowAlter } from "pages/boards/altBoard/formAiPermission";
import { TSchool } from "types/schools";
import { TAiSettings } from "types/seasons";

export const isLibraryStaffAuth = (auth?: string | null) =>
  auth === "admin" || auth === "manager" || auth === "owner";

/** 도서관 페이지·Alter 헤더 진입 (관리자 또는 Alter 사용 가능한 교사) */
export const canAccessAlterLibrary = ({
  auth,
  role,
  school,
  season,
}: {
  auth?: string | null;
  role?: string | null;
  school?: Pick<TSchool, "aiEnabled" | "academyFeatures" | "aiConfig"> | null;
  season?: { aiSettings?: TAiSettings } | null;
}) => {
  if (isLibraryStaffAuth(auth)) return true;
  if (role !== "teacher") return false;
  return canShowAlter(school, season, { role, auth });
};
