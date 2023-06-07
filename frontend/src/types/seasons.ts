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

export type TSeason = {
  _id: string;
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
  permissionSyllabusV2: TPermission;
  permissionEnrollmentV2: TPermission;
  permissionEvaluationV2: TPermission;
  formTimetable: any;
  formSyllabus: any;
  formEvaluation: TFormEvaluation[];
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
