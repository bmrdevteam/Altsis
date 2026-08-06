import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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

export type TAlterSkillId =
  | "chat"
  | "syllabus-draft"
  | "evaluation-draft"
  | "archive-draft"
  | "document-draft"
  | "document-review"
  | "form-response-draft"
  | "activity-draft"
  | "assessment-grade";

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
};

export type TAlterActivityDraft = {
  title?: string;
  description?: string;
  fields: TAltFormField[];
  settings?: Partial<TAltFormSettings> & Record<string, unknown>;
  rubrics?: TFormRubric[];
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

export type TAlterPageContext = {
  pageType:
    | "syllabus-edit"
    | "evaluation"
    | "archive"
    | "document"
    | "docs"
    | "form-response"
    | "activity"
    | "assessment-grade"
    | "general";
  label?: string;
  subject?: string[];
  classTitle?: string;
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
  getAssessmentGradeContext?: () => TAlterAssessmentGradeContext;
  applyGradeDraft?: (
    draft: TAlterAssessmentGradeDraft,
    opts?: { fillEmptyOnly?: boolean }
  ) => { applied: boolean };
  suggestedSkills: TAlterSkillId[];
};

type AlterContextValue = {
  isOpen: boolean;
  isExpanded: boolean;
  /** 패널이 닫혀 있어도 진행 중인 작업이 있으면 true */
  isWorking: boolean;
  /** 닫힌 동안 결과가 도착했는지 (다시 열면 확인) */
  hasBackgroundResult: boolean;
  close: () => void;
  toggle: () => void;
  toggleExpanded: () => void;
  setIsWorking: (v: boolean) => void;
  setHasBackgroundResult: (v: boolean) => void;
  pageContext: TAlterPageContext | null;
  registerPageContext: (ctx: TAlterPageContext | null) => void;
};

const AlterContext = createContext<AlterContextValue | null>(null);

export const AlterProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [hasBackgroundResult, setHasBackgroundResult] = useState(false);
  const [pageContext, setPageContext] = useState<TAlterPageContext | null>(
    null
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setIsExpanded(false);
  }, []);
  const toggle = useCallback(() => {
    setIsOpen((v) => {
      if (v) setIsExpanded(false);
      else setHasBackgroundResult(false);
      return !v;
    });
  }, []);
  const toggleExpanded = useCallback(
    () => setIsExpanded((v) => !v),
    []
  );
  const registerPageContext = useCallback((ctx: TAlterPageContext | null) => {
    setPageContext(ctx);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      isExpanded,
      isWorking,
      hasBackgroundResult,
      close,
      toggle,
      toggleExpanded,
      setIsWorking,
      setHasBackgroundResult,
      pageContext,
      registerPageContext,
    }),
    [
      isOpen,
      isExpanded,
      isWorking,
      hasBackgroundResult,
      close,
      toggle,
      toggleExpanded,
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
