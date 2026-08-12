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

/** 평가 모드 항목 채점 방식 (퀴즈 auto_exact는 퀴즈 전용) */
export type TGradingMethod =
  | "none"
  | "completion"
  | "manual_score"
  | "rubric";

export type TRubricLevel = {
  id: string;
  label: string;
  description?: string;
  points?: number;
};

export type TFormRubric = {
  id: string;
  title: string;
  levels: TRubricLevel[];
};

export type TAssessmentSettings = {
  revealOn: "finalized";
  /** 확정 후 학생에게 점수·항목 루브릭을 모두 공개 (고정) */
  finalEvaluation: {
    mode: "both";
  };
};

export type TAssessmentFieldRubricGrade = {
  levelId?: string;
  levelLabel?: string;
  score?: number;
  max?: number;
  comment?: string;
};

export type TAssessmentFieldGrade = {
  score?: number;
  max?: number;
  /** @deprecated 단일 루브릭 하위 호환 — byRubric 우선 */
  levelId?: string;
  levelLabel?: string;
  comment?: string;
  source: "completion" | "manual" | "rubric";
  /** 필드에 연결된 루브릭별 채점 */
  byRubric?: Record<string, TAssessmentFieldRubricGrade>;
  gradedBy?: { user: string; userId: string; userName: string };
  gradedAt?: string;
};

export type TAssessmentFinal = {
  status: "draft" | "finalized";
  score?: number;
  max?: number;
  levelId?: string;
  levelLabel?: string;
  comment?: string;
  finalizedBy?: { user: string; userId: string; userName: string };
  finalizedAt?: string;
};

export type TAssessmentData = {
  byField: Record<string, TAssessmentFieldGrade>;
  final: TAssessmentFinal;
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
  gradingMethod?: TGradingMethod;
  /** @deprecated 단일 루브릭 — rubricIds 우선 */
  rubricId?: string;
  /** gradingMethod === rubric 일 때 사용할 양식 루브릭 id 목록 */
  rubricIds?: string[];
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
   * 필수 응답: 미제출 뱃지·활동 탭 카운트에 포함.
   * true일 때만 필수. 미설정·false는 선택(미제출 미표시).
   */
  requiredMode?: boolean;
  quizMode?: boolean;
  quizSettings?: TQuizSettings;
  /** 평가 모드 (퀴즈와 상호 배타) */
  assessmentMode?: boolean;
  assessmentSettings?: TAssessmentSettings;
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
  /** 양식 스코프 루브릭 (평가 모드) */
  rubrics?: TFormRubric[];
  settings: TAltFormSettings;
  sheet: string;
  isActive: boolean;
  /** 비공개(true): 작성자만 목록·열람 / 공개(false) */
  isDraft?: boolean;
  createdAt: string;
  updatedAt: string;
  /** 목록 API 메타: 응답 행 수 (_respondent 있는 행) */
  responseCount?: number;
  /** 목록 API 메타: 마지막 기록 열람 이후 신규 응답 수 (admin/writer) */
  unreadResponseCount?: number;
  /** 목록 API 메타: 제출완료 여부 (필수+복수면 목표 횟수 달성 시) */
  mySubmitted?: boolean;
  /** 목록 API 메타: 내 제출 건수 */
  myResponseCount?: number;
};
