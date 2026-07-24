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
  /**
   * 필수 + 복수 응답일 때 목표 제출 횟수.
   * 내 제출 수 >= 이 값이면 제출완료(n/n).
   */
  requiredResponseCount?: number | null;
  /**
   * 필수 모드: 미제출 뱃지·활동 탭 카운트에 포함.
   * true일 때만 필수. 미설정·false는 선택(미제출 미표시).
   */
  requiredMode?: boolean;
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
  /** 비공개(true): 작성자만 목록·열람 / 공개(false) */
  isDraft?: boolean;
  createdAt: string;
  updatedAt: string;
  /** 목록 API 메타: 응답 행 수 (_respondent 있는 행) */
  responseCount?: number;
  /** 목록 API 메타: 제출완료 여부 (필수+복수면 목표 횟수 달성 시) */
  mySubmitted?: boolean;
  /** 목록 API 메타: 내 제출 건수 */
  myResponseCount?: number;
};
