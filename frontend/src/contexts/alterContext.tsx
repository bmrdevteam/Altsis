import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  TAltFormField,
  TAltFormSettings,
  TFormRubric,
} from "types/altForm";
import { TFormEvaluation } from "types/seasons";
import { TSchoolFormArchiveField } from "types/schools";
import type {
  TAlterChatSnapshot,
  TAlterChatSnapshotItem,
} from "utils/alterChatSnapshot";
import type { TActivityDraftAccess } from "utils/activityDraft";
import type { TFormDraftOp } from "utils/formDraftApply";

export type { TAlterChatSnapshot, TAlterChatSnapshotItem };

export type TAlterSkillId =
  | "chat"
  | "syllabus-draft"
  | "evaluation-draft"
  | "archive-draft"
  | "document-draft"
  | "document-review"
  | "form-response-draft"
  | "activity-draft"
  | "form-draft"
  | "assessment-grade"
  | "search";

export type TAlterReviewDocument = {
  title: string;
  content: string;
  fieldNames?: string[];
  studentLabel?: string;
};

export type TAlterAssessmentGradeField = {
  fieldId: string;
  label: string;
  gradingMethod: string;
  points?: number;
  rubrics: Array<{
    id: string;
    title?: string;
    levels: Array<{
      id: string;
      label: string;
      description?: string;
      points?: number;
    }>;
  }>;
};

export type TAlterAssessmentGradeContext = {
  formId: string;
  rowId: string;
  formTitle: string;
  boardName?: string;
  respondentName?: string;
  respondentId?: string;
  finalized: boolean;
  fields: TAlterAssessmentGradeField[];
  responses: Record<string, string>;
  currentDraft: {
    byField: Record<
      string,
      {
        score?: number;
        levelId?: string;
        comment?: string;
        byRubric?: Record<string, { levelId?: string; comment?: string }>;
      }
    >;
    final: { comment?: string };
  };
};

export type TAlterAssessmentGradeDraft = {
  byField?: TAlterAssessmentGradeContext["currentDraft"]["byField"];
  final?: { comment?: string };
  fillEmptyOnly?: boolean;
};

export type TAlterActivitySnapshot = {
  title: string;
  description: string;
  fields: TAltFormField[];
  settings: TAltFormSettings & Record<string, unknown>;
  rubrics?: TFormRubric[];
  boardName?: string;
  access?: TActivityDraftAccess;
};

export type TAlterActivityDraft = {
  title?: string;
  description?: string;
  fields: TAltFormField[];
  settings?: Partial<TAltFormSettings> & Record<string, unknown>;
  rubrics?: TFormRubric[];
  access?: TActivityDraftAccess;
};

export type TAlterEvaluationRow = {
  studentId: string;
  studentName?: string;
  studentGrade?: string;
  evaluation: Record<string, unknown>;
};

export type TAlterArchiveRow = {
  studentId: string;
  studentName?: string;
  studentGrade?: string;
  archiveId?: string;
  registrationId?: string;
  values: Record<string, unknown>;
};

export type TAlterDocumentSnapshot = {
  title: string;
  content: string;
  boardName?: string;
};

export type TAlterFormResponseField = {
  fieldId: string;
  label?: string;
  type: string;
  permission?: string;
  options?: string[];
  template?: string;
  validation?: { min?: number; max?: number };
  currentValue?: unknown;
};

export type TAlterFormResponseSnapshot = {
  formId: string;
  formTitle: string;
  boardName?: string;
  fields: TAlterFormResponseField[];
  responses: Record<string, unknown>;
  userCandidates?: Array<{
    user: string;
    userId: string;
    userName: string;
  }>;
};

export type TAlterFormResponseDraft = {
  byField?: Record<string, unknown>;
  fillEmptyOnly?: boolean;
  writeMode?: "create" | "refine";
};

export type TAlterFormDraft = {
  title?: string;
  writeMode?: "create" | "refine";
  formType?: string;
  blocks?: any[];
  ops?: TFormDraftOp[];
};

export type TAlterFormSnapshot = {
  formId: string;
  title: string;
  formType: "timetable" | "syllabus" | "print" | "other" | string;
  blocks: any[];
};

export type TAlterPageContext = {
  pageType:
    | "syllabus-edit"
    | "syllabus"
    | "evaluation"
    | "archive"
    | "document"
    | "docs"
    | "form-response"
    | "activity"
    | "form-editor"
    | "assessment-grade"
    | "course-list"
    | "calendar"
    | "sheet"
    | "board-chat"
    | "guide"
    | "general";
  label?: string;
  subject?: string[];
  classTitle?: string;
  /** chat이 근거로 쓸 페이지 로드 데이터 (`dataExpand`: 데이터 확대) */
  getChatSnapshot?: (opts?: {
    dataExpand?: boolean;
  }) => TAlterChatSnapshot | null;
  getCurrentInfo?: () => Record<string, any>;
  formSyllabus?: any;
  applyFieldSuggestion?: (fieldLabel: string, suggestion: string) => void;
  applyInfoDraft?: (
    values: Record<string, string>
  ) => { applied: number; skipped: number };
  syllabusId?: string;
  formEvaluation?: TFormEvaluation;
  getEvaluationCsv?: () => string;
  getEvaluationRows?: () => TAlterEvaluationRow[];
  applyEvaluationCsv?: (
    csv: string,
    opts: { fillEmptyOnly: boolean }
  ) => { applied: number; skipped: number; unknownIds: string[] };
  archiveLabel?: string;
  formArchiveFields?: TSchoolFormArchiveField[];
  getArchiveRows?: () => TAlterArchiveRow[];
  applyArchiveDraft?: (
    draft: {
      rows: Array<{
        studentId: string;
        values: Record<string, string>;
      }>;
      fillEmptyOnly?: boolean;
      targetLabels?: string[];
    },
    opts: { fillEmptyOnly: boolean }
  ) => { applied: number; skipped: number; unknownIds: string[] };
  boardId?: string;
  boardName?: string;
  getDocument?: () => TAlterDocumentSnapshot;
  applyDocumentDraft?: (draft: {
    title?: string;
    content: string;
  }) => { applied: boolean };
  /** 문서 점검용 스냅샷 (문서함·보드 문서) */
  getReviewDocument?: () => TAlterReviewDocument;
  getFormResponse?: () => TAlterFormResponseSnapshot;
  applyFormResponseDraft?: (
    draft: TAlterFormResponseDraft
  ) => { applied: number; skipped: number };
  getActivity?: () => TAlterActivitySnapshot;
  applyActivityDraft?: (
    draft: TAlterActivityDraft
  ) => { applied: boolean };
  getForm?: () => TAlterFormSnapshot;
  applyFormDraft?: (draft: TAlterFormDraft) => { applied: boolean };
  getAssessmentGradeContext?: () => TAlterAssessmentGradeContext;
  applyGradeDraft?: (
    draft: TAlterAssessmentGradeDraft,
    opts?: { fillEmptyOnly?: boolean }
  ) => { applied: boolean };
  suggestedSkills: TAlterSkillId[];
};

type AlterContextValue = {
  isOpen: boolean;
  /** 활동 AI 챗봇과 같은 전체 화면 오버레이 */
  isFullscreen: boolean;
  /** 패널이 닫혀 있어도 진행 중인 작업이 있으면 true */
  isWorking: boolean;
  /** 닫힌 동안 결과가 도착했는지 (다시 열면 확인) */
  hasBackgroundResult: boolean;
  close: () => void;
  toggle: () => void;
  toggleFullscreen: () => void;
  setIsWorking: (v: boolean) => void;
  setHasBackgroundResult: (v: boolean) => void;
  pageContext: TAlterPageContext | null;
  /**
   * 페이지 컨텍스트 등록. 반환된 cleanup만 자신의 등록을 해제한다
   * (다른 화면/StrictMode cleanup이 최신 등록을 지우지 않도록).
   */
  registerPageContext: (ctx: TAlterPageContext) => () => void;
};

const AlterContext = createContext<AlterContextValue | null>(null);

export const AlterProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [hasBackgroundResult, setHasBackgroundResult] = useState(false);
  const [pageContext, setPageContext] = useState<TAlterPageContext | null>(
    null
  );
  const pageContextOwnerRef = useRef(0);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsFullscreen(false);
  }, []);
  const toggle = useCallback(() => {
    setIsOpen((v) => {
      if (v) setIsFullscreen(false);
      else setHasBackgroundResult(false);
      return !v;
    });
  }, []);
  const toggleFullscreen = useCallback(
    () => setIsFullscreen((v) => !v),
    []
  );
  const registerPageContext = useCallback((ctx: TAlterPageContext) => {
    const ownerId = ++pageContextOwnerRef.current;
    setPageContext(ctx);
    return () => {
      if (pageContextOwnerRef.current === ownerId) {
        setPageContext(null);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      isFullscreen,
      isWorking,
      hasBackgroundResult,
      close,
      toggle,
      toggleFullscreen,
      setIsWorking,
      setHasBackgroundResult,
      pageContext,
      registerPageContext,
    }),
    [
      isOpen,
      isFullscreen,
      isWorking,
      hasBackgroundResult,
      close,
      toggle,
      toggleFullscreen,
      pageContext,
      registerPageContext,
    ]
  );

  return (
    <AlterContext.Provider value={value}>{children}</AlterContext.Provider>
  );
};

export const useAlter = () => {
  const ctx = useContext(AlterContext);
  if (!ctx) {
    throw new Error("useAlter must be used within AlterProvider");
  }
  return ctx;
};
