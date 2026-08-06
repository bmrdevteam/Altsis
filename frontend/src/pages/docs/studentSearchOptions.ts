import { TRegistration } from "types/registrations";

export type StudentOption = {
  rid: string;
  uid: string;
  label: string;
  /** 트리거용: 이름 · 학번 · 학년 */
  summary: string;
  /** 목록용: 학번 · 학년 · 담임 · 그룹 */
  description: string;
  searchText: string;
};

export const toStudentOption = (reg: TRegistration): StudentOption => {
  const summary = [reg.userName, reg.userId, reg.grade]
    .filter(Boolean)
    .join(" · ");
  const description = [reg.userId, reg.grade, reg.teacherName, reg.group]
    .filter(Boolean)
    .join(" · ");
  return {
    rid: reg._id,
    uid: reg.user,
    label: reg.userName,
    summary,
    description,
    searchText: [
      reg.userName,
      reg.userId,
      reg.grade,
      reg.teacherName,
      reg.group,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
};

export const filterStudentOptions = (
  options: StudentOption[],
  query: string,
  maxResults: number
): StudentOption[] => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return options.slice(0, maxResults);
  return options
    .filter((opt) => opt.searchText.includes(trimmed))
    .slice(0, maxResults);
};
