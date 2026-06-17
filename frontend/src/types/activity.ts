import { TAltFormField, TAltFormSettings } from "./altForm";

export type TActivityType = "assignment" | "quiz" | "discussion";
export type TActivityStatus = "draft" | "published" | "closed";
export type TActivityEvaluationMode = "none" | "feedback" | "formal";
export type TActivityTemplateScope = "builtin" | "school" | "personal";
export type TActivitySubmissionStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "returned"
  | "completed";

export type TActivityAttachment = {
  name?: string;
  key?: string;
  url?: string;
  originalName?: string;
};

export type TActivityRubricItem = {
  label?: string;
  description?: string;
  score?: number;
};

export type TActivityTemplatePreset = {
  content: string;
  attachments: TActivityAttachment[];
  altFormSchema: {
    fields: TAltFormField[];
    settings: Partial<TAltFormSettings> & Record<string, any>;
  };
  rubric: TActivityRubricItem[];
};

export type TActivityTemplate = {
  _id: string;
  scope: TActivityTemplateScope;
  school?: string;
  schoolId?: string;
  schoolName?: string;
  creator?: string;
  creatorId?: string;
  creatorName?: string;
  type: TActivityType;
  name: string;
  preset: TActivityTemplatePreset;
  isEditable: boolean;
  isActive: boolean;
  builtinKey?: string;
  createdAt: string;
  updatedAt: string;
};

export type TActivity = {
  _id: string;
  syllabus: string;
  season: string;
  school: string;
  schoolId: string;
  schoolName: string;
  year: string;
  term: string;
  classTitle: string;
  type: TActivityType;
  status: TActivityStatus;
  title: string;
  content: string;
  attachments: TActivityAttachment[];
  altForm?: string;
  altBoard?: string;
  openAt?: string;
  dueAt?: string;
  allowLateSubmission: boolean;
  allowResubmit: boolean;
  evaluationMode: TActivityEvaluationMode;
  rubric: TActivityRubricItem[];
  sourceTemplate?: string;
  order: number;
  creator?: string;
  creatorId?: string;
  creatorName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TActivitySubmissionFeedback = {
  author?: string;
  authorId?: string;
  authorName?: string;
  message: string;
  createdAt: string;
};

export type TActivitySubmission = {
  _id: string;
  activity: string;
  syllabus: string;
  season: string;
  school: string;
  enrollment: string;
  student: string;
  studentId: string;
  studentName: string;
  altSheetRow?: string;
  status: TActivitySubmissionStatus;
  submittedAt?: string;
  resubmitCount: number;
  feedback: TActivitySubmissionFeedback[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const ACTIVITY_TYPE_LABEL_MAP: Record<TActivityType, string> = {
  assignment: "과제",
  quiz: "퀴즈",
  discussion: "토론",
};

export const ACTIVITY_STATUS_LABEL_MAP: Record<TActivityStatus, string> = {
  draft: "초안",
  published: "게시됨",
  closed: "마감",
};

export const ACTIVITY_TEMPLATE_SCOPE_LABEL_MAP: Record<
  TActivityTemplateScope,
  string
> = {
  builtin: "기본",
  school: "학교",
  personal: "개인",
};

const buildDefaultRespondentField = (
  id: string,
  label: string,
  type: TAltFormField["type"],
  order: number
): TAltFormField => {
  return {
    _id: id,
    label,
    type,
    permission: "respondent",
    visibleToRespondent: true,
    required: true,
    options: [],
    order,
  };
};

const buildDefaultFeedbackField = (id: string, order: number): TAltFormField => {
  return {
    _id: id,
    label: "교사 피드백",
    type: "textarea",
    permission: "owner",
    visibleToRespondent: true,
    required: false,
    options: [],
    order,
  };
};

export const buildDefaultActivityTemplatePreset = (
  type: TActivityType
): TActivityTemplatePreset => {
  if (type === "quiz") {
    return {
      content: "퀴즈 문항과 제출 지침을 입력하세요.",
      attachments: [],
      altFormSchema: {
        fields: [
          buildDefaultRespondentField("quiz_answer", "답안", "textarea", 0),
          buildDefaultFeedbackField("quiz_feedback", 1),
        ],
        settings: {
          allowResubmit: true,
          showOwnResponse: true,
          showOwnerFields: false,
          shareResponses: false,
        },
      },
      rubric: [],
    };
  }

  if (type === "discussion") {
    return {
      content: "토론 주제와 참여 방법을 입력하세요.",
      attachments: [],
      altFormSchema: {
        fields: [
          buildDefaultRespondentField(
            "discussion_opinion",
            "토론 의견",
            "textarea",
            0
          ),
          buildDefaultFeedbackField("discussion_feedback", 1),
        ],
        settings: {
          allowResubmit: true,
          showOwnResponse: true,
          showOwnerFields: false,
          shareResponses: true,
        },
      },
      rubric: [],
    };
  }

  return {
    content: "과제 안내를 입력하세요.",
    attachments: [],
    altFormSchema: {
      fields: [
        buildDefaultRespondentField(
          "assignment_answer",
          "과제 제출 내용",
          "textarea",
          0
        ),
        buildDefaultRespondentField("assignment_link", "참고 링크", "link", 1),
        buildDefaultFeedbackField("assignment_feedback", 2),
      ],
      settings: {
        allowResubmit: true,
        showOwnResponse: true,
        showOwnerFields: false,
        shareResponses: false,
      },
    },
    rubric: [],
  };
};
