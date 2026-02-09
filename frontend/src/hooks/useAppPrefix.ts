import { useAuth } from "contexts/authContext";

export function useAppPrefix(): string {
  const { currentUser, currentSchool } = useAuth();
  if (currentUser?.academyId && currentSchool?.schoolId) {
    return `/${currentUser.academyId}/${currentSchool.schoolId}`;
  }
  return "";
}
