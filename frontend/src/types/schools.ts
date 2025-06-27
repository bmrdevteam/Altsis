export type TSchoolFormArchiveField = {
  label: string;
  type: "input" | "input-number" | "select" | "calendar" | "file" | "file-image";
  options?: string[];
  date? : object;
  duplicationCheck?: boolean;
  runningTotal?: boolean;
  total?: boolean;
};

export type TAuthTeacher =
  | "undefined"
  | "viewAndEditStudents"
  | "viewAndEditSelf"
  | "viewAndEditMyStudents";

export type TAuthStudent = "undefined" | "view" | "viewAndEditSelf";

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
  ["viewAndEditStudents", "모든 학생 조회 및 작성"],
  ["viewAndEditMyStudents", "담당 학생 조회 및 작성"],
  ["viewAndEditSelf", "자기 정보 조회 및 작성"],
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
  ["viewAndEditSelf", "자기 정보 조회 및 작성"],
]);
export const getAuthStudentText = (text: TAuthStudent) => {
  return authStudentTextMap.get(text) ?? "미설정";
};

const textAuthStudentMap: Map<string, string> = new Map(
  Array.from(authStudentTextMap).reverse()
);
authStudentTextMap.forEach((value, key) => textAuthStudentMap.set(value, key));

export const getAuthStudent = (text: string) => {
  if (text === "") return undefined;
  return (textAuthStudentMap.get(text) ?? "undefined") as TAuthStudent;
};
