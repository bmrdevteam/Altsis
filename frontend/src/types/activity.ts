import { TAltFormField } from "types/altForm";

export type TActivityType = "assignment" | "quiz" | "discussion";
export type TActivityStatus = "draft" | "published" | "closed";
export type TActivitySubmissionStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "returned"
  | "completed";
export type TActivityEvaluationMode = "none" | "feedback" | "formal";
export type TActivityTemplateScope = "builtin" | "school" | "personal";

export type TActivityTemplateField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
};

export type TRubricItem = {
  label: string;
  maxScore?: number;
  description?: string;
};

export type TActivityAttachment = {
  name: string;
  url: string;
  size?: number;
};

export type TActivityTemplatePreset = {
  content?: string;
  altFormSchema?: TActivityTemplateField[];
  rubric?: TRubricItem[];
  aiTutor?: object;
};

export type TActivityTemplate = {
  _id: string;
  scope: TActivityTemplateScope;
  school?: string;
  schoolId?: string;
  schoolName?: string;
  name: string;
  type: TActivityType;
  description?: string;
  preset: TActivityTemplatePreset;
  isEditable: boolean;
  user?: string;
  userId?: string;
  userName?: string;
};

export type TActivity = {
  _id: string;
  syllabus: string;
  season?: string;
  school?: string;
  title: string;
  type: TActivityType;
  status: TActivityStatus;
  content?: string;
  attachments?: TActivityAttachment[];
  altForm?: string;
  altBoard?: string;
  openAt?: string;
  dueAt?: string;
  allowLateSubmission?: boolean;
  allowResubmit?: boolean;
  evaluationMode?: TActivityEvaluationMode;
  rubric?: TRubricItem[];
  sourceTemplate?: string;
  order?: number;
};

export type TActivityFeedback = {
  _id?: string;
  user?: string;
  userId?: string;
  userName?: string;
  content: string;
  createdAt?: string;
};

export type TActivitySubmission = {
  _id: string;
  activity: string;
  altSheetRow?: string;
  enrollment: string;
  student: string;
  studentId: string;
  studentName: string;
  studentGrade?: string;
  status: TActivitySubmissionStatus;
  feedback: TActivityFeedback[];
  submittedAt?: string;
  resubmitCount?: number;
  altSheetRowData?: { data: Record<string, unknown> };
  altForm?: { fields: TAltFormField[] };
};

export const ACTIVITY_TYPE_LABELS: Record<TActivityType, string> = {
  assignment: "과제",
  quiz: "퀴즈",
  discussion: "토론",
};

export const ACTIVITY_STATUS_LABELS: Record<TActivityStatus, string> = {
  draft: "초안",
  published: "게시됨",
  closed: "마감",
};

export const SUBMISSION_STATUS_LABELS: Record<TActivitySubmissionStatus, string> =
  {
    not_started: "미시작",
    in_progress: "작성중",
    submitted: "제출됨",
    returned: "피드백",
    completed: "완료",
  };
