export type TUser = {
  _id: string;
  auth: "owner" | "admin" | "manager" | "member";
  userId: string;
  userName: string;
  schools: {
    school: string;
    schoolId: string;
    schoolName: string;
  }[];
  tel?: string;
  email?: string;
  snsId?: { google: string };
  profile?: string;
  academyId: string;
  academyName: string;
  //____________________//
  registrations: TRegistration[];
};

export type TSchool = {
  _id: string;
  school: string;
  schoolId: string;
  schoolName: string;
  formArchive: {
    label: string;
    dataType: "array" | "object";
    fields: any[];
    authTeacher: "undefined" | "viewAndEditStudents" | "viewAndEditMyStudents";
    authStudent: "undefined" | "view";
  }[];
  links: {
    url: string;
    title: string;
  }[];
};

export type TFormEvaluation = {
  label: string;
  type: string; // input,
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

export type TRegistration = {
  _id: string;
  school: string;
  season: string;
  period?: {
    start: string;
    end: string;
  };
  year: string;
  term: string;
  isActivated: boolean;
  role: "teacher" | "student";
  memos: any[];
  permissionSyllabusV2: boolean;
  permissionEnrollmentV2: boolean;
  permissionEvaluationV2: boolean;
  formEvaluation: TFormEvaluation;
};

export type Exception = {
  registration: string;
  role: string;
  user: string;
  userId: string;
  userName: string;
  isAllowed: boolean;
};

export type Permission = {
  teacher: boolean;
  student: boolean;
  exceptions: Exception[];
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

export type TSeason = {
  _id: string;
  classrooms: string[];
  subjects: {
    label: string[];
    data: string[][];
  };
  year: string;
  term: string;
  // permissionSyllabus: [[]]; //deprecated
  // permissionEnrollment: [[]]; //deprecated
  // permissionEvaluation: [[]]; //deprecated
  permissionSyllabusV2: Permission[];
  permissionEnrollmentV2: Permission[];
  permissionEvaluationV2: Permission[];
  formTimetable: any;
  formSyllabus: any;
  formEvaluation: TFormEvaluation[];
  isActivated: boolean;
  //____________________//
  registrations: TSeasonRegistration[];
};
