import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type TAlterSkillId = "chat" | "syllabus-review";

export type TAlterPageContext = {
  pageType: "syllabus-edit" | "general";
  label?: string;
  subject?: string[];
  classTitle?: string;
  getCurrentInfo?: () => Record<string, any>;
  formSyllabus?: any;
  applyFieldSuggestion?: (fieldLabel: string, suggestion: string) => void;
  suggestedSkills: TAlterSkillId[];
};

type AlterContextValue = {
  isOpen: boolean;
  isExpanded: boolean;
  close: () => void;
  toggle: () => void;
  toggleExpanded: () => void;
  pageContext: TAlterPageContext | null;
  registerPageContext: (ctx: TAlterPageContext | null) => void;
};

const AlterContext = createContext<AlterContextValue | null>(null);

export const AlterProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
      close,
      toggle,
      toggleExpanded,
      pageContext,
      registerPageContext,
    }),
    [
      isOpen,
      isExpanded,
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
