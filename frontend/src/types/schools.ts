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

export type TAuthStudent = "undefined" | "view" | "viewAndEdit";

export type TAuthManager = "undefined" | "viewAndEdit";

export type TSchoolFormArchiveItem = {
  label: string;
  dataType: "array" | "object";
  fields: TSchoolFormArchiveField[];
  authTeacher: TAuthTeacher;
  authStudent: TAuthStudent;
  authManager: TAuthManager;
};

export type TSchoolFormArchive = TSchoolFormArchiveItem[];

export type TDeletedSchoolFormArchiveItem = TSchoolFormArchiveItem & {
  deletedAt: string;
};

export type TDeletedSchoolFormArchive = TDeletedSchoolFormArchiveItem[];

export type TSchool = {
  _id: string;
  school: string;
  schoolId: string;
  schoolName: string;
  formArchive: TSchoolFormArchive;
  deletedFormArchive?: TDeletedSchoolFormArchive;
  links: {
    url: string;
    title: string;
  }[];
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
  ["viewAndEdit", "조회 및 수정"],
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

export const authManagerTextMap: Map<TAuthManager, string> = new Map([
  ["undefined", "미설정"],
  ["viewAndEdit", "조회 및 수정"],
]);

export const getAuthManagerText = (text: TAuthManager) => {
  return authManagerTextMap.get(text) ?? "미설정";
};

const textAuthManagerMap: Map<string, string> = new Map();
authManagerTextMap.forEach((value, key) => textAuthManagerMap.set(value, key));

export const getAuthManager = (text: string) => {
  if (text === "") return undefined;
  return (textAuthManagerMap.get(text) ?? "undefined") as TAuthManager;
};
