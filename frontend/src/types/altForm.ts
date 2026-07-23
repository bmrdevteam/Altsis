export type TAltFormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "multiDate"
  | "time"
  | "file"
  | "select"
  | "multiSelect"
  | "checkbox"
  | "radio"
  | "userSelect"
  | "rating"
  | "scale"
  | "counter"
  | "approval"
  | "link"
  | "content"
  | "docResponse";

export type TAltFormFieldPermission = "respondent" | "owner";

export type TDisplayConditionOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "isEmpty"
  | "isNotEmpty"
  | "before"
  | "after";

export type TDisplayCondition = {
  enabled: boolean;
  logic: "and" | "or";
  conditions: {
    fieldId: string;
    operator: TDisplayConditionOperator;
    value: any;
  }[];
};

export type TDuplicateCheck = {
  enabled: boolean;
  mode: "free" | "preRegistration";
  allowedCount: number;
};

export type TApprovalStepMode = "fixed" | "pick";

export type TApprovalApprover = {
  user: string;
  userId: string;
  userName: string;
};

export type TApprovalLineStepDef = {
  order: number;
  label: string;
  mode: TApprovalStepMode;
  /** mode === fixed 일 때 승인자 */
  approver?: TApprovalApprover;
};

export type TApprovalLine = {
  steps: TApprovalLineStepDef[];
};

export type TAltFormField = {
  _id: string;
  label: string;
  type: TAltFormFieldType;
  permission: TAltFormFieldPermission;
  visibleToRespondent: boolean;
  required: boolean;
  options?: string[];
  validation?: Record<string, any>;
  /** content: 읽기 전용 안내 마크다운 / docResponse: 응답 템플릿 마크다운 */
  content?: string;
  order: number;
  displayCondition?: TDisplayCondition;
  correctAnswer?: any;
  points?: number;
  duplicateCheck?: TDuplicateCheck;
  /** type === approval: 결재선 (양식에 저장, 복제·JSON과 함께 이동) */
  approvalLine?: TApprovalLine;
};

export type TQuizSettings = {
  scoreReveal: "immediately" | "afterDeadline" | "never";
  answerReveal: "immediately" | "afterDeadline" | "never";
  showWrongMarks: boolean;
};

export type TAltFormSettings = {
  openAt?: string;
  closeAt?: string;
  allowResubmit: boolean;
  allowMultipleResponses?: boolean;
  quizMode?: boolean;
  quizSettings?: TQuizSettings;
  directInputMode?: boolean;
  shareResponses?: boolean;
  showOwnerFields?: boolean;
  showOwnResponse?: boolean;
};

export type TAltForm = {
  _id: string;
  board: string;
  school: string;
  creator: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  fields: TAltFormField[];
  settings: TAltFormSettings;
  sheet: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** 목록 API 메타: 응답 행 수 (_respondent 있는 행) */
  responseCount?: number;
  /** 목록 API 메타: 내가 제출했는지 */
  mySubmitted?: boolean;
};
