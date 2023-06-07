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
  role: "teacher" | "student";
  memos: any[];
  permissionSyllabusV2: boolean;
  permissionEnrollmentV2: boolean;
  permissionEvaluationV2: boolean;
  formEvaluation: TFormEvaluation;
};
