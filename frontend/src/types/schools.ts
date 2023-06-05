export type TSchoolFormArchiveField = {
  label: string;
  type: "input" | "input-number" | "select" | "file" | "file-image";
  options?: string[];
  runningTotal?: boolean;
  total?: boolean;
};

export type TAuthTeacher =
  | "undefined"
  | "viewAndEditStudents"
  | "viewAndEditMyStudents";

export type TAuthStudent = "undefined" | "view";

export type TSchoolFormArchiveItem = {
  label: string;
  dataType: "array" | "object";
  fields: TSchoolFormArchiveField[];
  authTeacher: TAuthTeacher;
  authStudent: TAuthStudent;
};

export type TSchoolFormArchive = TSchoolFormArchiveItem[];

export type TSchool = {
  _id: string;
  school: string;
  schoolId: string;
  schoolName: string;
  formArchive: TSchoolFormArchive;
  links: {
    url: string;
    title: string;
  }[];
  calendar?: string;
  calendarTimetable?: string;
};

export const authTeacherTextMap: Map<TAuthTeacher, string> = new Map([
  ["undefined", "미설정"],
  ["viewAndEditStudents", "모든 학생 조회 및 수정"],
  ["viewAndEditMyStudents", "담당 학생 조회 및 수정"],
]);

export const getAuthTeacherText = (text: TAuthTeacher) => {
  return authTeacherTextMap.get(text) ?? "미설정";
};

const textAuthTeacherMap: Map<string, string> = new Map();
authTeacherTextMap.forEach((value, key) => textAuthTeacherMap.set(value, key));

export const getAuthTeacher = (text: string) => {
  if (text === "") return undefined;
  return (textAuthTeacherMap.get(text) ?? "undefined") as TAuthTeacher;
};

export const authStudentTextMap: Map<TAuthStudent, string> = new Map([
  ["undefined", "미설정"],
  ["view", "조회"],
]);
export const getAuthStudentText = (text: TAuthStudent) => {
  return authStudentTextMap.get(text) ?? "미설정";
};

const textAuthStudentMap: Map<string, string> = new Map(
  Array.from(authStudentTextMap).reverse()
);
authStudentTextMap.forEach((value, key) => textAuthStudentMap.set(value, key));

export const getAuthStudent = (text: string) => {
  console.log({ text });
  if (text === "") return undefined;
  return (textAuthStudentMap.get(text) ?? "undefined") as TAuthStudent;
};
