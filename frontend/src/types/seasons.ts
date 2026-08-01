export type TFormEvaluation = {
  label: string;
  type: "input" | "input-number" | "select";
  options: string[];
  combineBy: "term" | "year";
  authOption:
    | "editByStudent"
    | "editByTeacher"
    | "editByTeacherAndStudentCanView";
  auth: {
    edit: {
      student: boolean;
      teacher: boolean;
    };
    view: {
      student: boolean;
      teacher: boolean;
    };
  };
}[];

export type TPermissionException = {
  registration: string;
  role: string;
  user: string;
  userId: string;
  userName: string;
  isAllowed: boolean;
};

export type TPermission = {
  teacher: boolean;
  student: boolean;
  exceptions: TPermissionException[];
};

export type TFormTimetable = {
  title: string;
  data: any[];
};

export type TAiReference = {
  title: string;
  content: string;
  fileName?: string;
  fileKey?: string;
  fileSize?: number;
  mimeType?: string;
};

export type TAiPermission = {
  teacher: boolean;
  student: boolean;
};

export type TAiSettings = {
  enabled: boolean;
  permission: TAiPermission;
  guidelines: string;
  references: TAiReference[];
  /** 양식 필드명 → 모범 문장 (하위 호환) */
  examples?: Record<string, string>;
  /** 모범으로 쓸 기존 강의계획서 ID (최대 2개) */
  exampleSyllabusIds?: string[];
};

export type TSeason = {
  _id: string;
  school: string;
  classrooms: string[];
  subjects: {
    label: string[];
    data: string[][];
  };
  year: string;
  term: string;
  period?: {
    start?: string;
    end?: string;
  };
  minCredit?: number;
  maxCredit?: number;
  permissionSyllabusV2: TPermission;
  permissionEnrollmentV2: TPermission;
  permissionEvaluationV2: TPermission;
  formTimetable: TFormTimetable;
  formSyllabus: any;
  formEvaluation: TFormEvaluation;
  aiSettings?: TAiSettings;
  isActivated: boolean;
  isActivatedFirst: boolean;
};

export type TSeasonRegistration = {
  _id: string;
  user: string;
  userId: string;
  userName: string;
  role?: "teacher" | "student";
  grade?: string;
  teacher?: string;
  teacherId?: string;
  teacherName?: string;
  subTeacher?: string;
  subTeacherId?: string;
  subTeacherName?: string;
  group?: string;
};

export type TSeasonWithRegistrations = TSeason & {
  registrations: TSeasonRegistration[];
};
