import { TFormEvaluation } from "./seasons";

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

  user: string;
  userId: string;
  userName: string;

  role?: "teacher" | "student";
  grade?: string;
  group?: string;
  teacher?: string;
  teacherId?: string;
  teacherName?: string;
  subTeacher?: string;
  subTeacherId?: string;
  subTeacherName?: string;

  memos: any[];
  permissionSyllabusV2: boolean;
  permissionEnrollmentV2: boolean;
  permissionEvaluationV2: boolean;
  formEvaluation: TFormEvaluation;
};
