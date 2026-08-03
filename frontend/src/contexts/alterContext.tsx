import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { TFormEvaluation } from "types/seasons";
import { TSchoolFormArchiveField } from "types/schools";

export type TAlterSkillId =
  | "chat"
  | "syllabus-draft"
  | "evaluation-draft"
  | "archive-draft"
  | "document-draft";

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

export type TAlterPageContext = {
  pageType:
    | "syllabus-edit"
    | "evaluation"
    | "archive"
    | "document"
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
