import { useEffect, useRef } from "react";
import { useAlter } from "contexts/alterContext";
import { extractSyllabusInputFields } from "utils/syllabusAiFields";

type Params = {
  label: string;
  subject: string[];
  classTitle: string;
  getCurrentInfo: () => Record<string, any>;
  onApplyInfo: (next: Record<string, any>) => void;
  formSyllabus: any;
};

/**
 * 수업 개설/수정 화면에서 Navbar Alter에 강의계획서 문맥을 등록한다.
 */
const useRegisterAlterSyllabus = (params: Params) => {
  const { registerPageContext } = useAlter();
  const subjectKey = params.subject.join("/");
  const getCurrentInfoRef = useRef(params.getCurrentInfo);
  const onApplyInfoRef = useRef(params.onApplyInfo);
  getCurrentInfoRef.current = params.getCurrentInfo;
  onApplyInfoRef.current = params.onApplyInfo;

  useEffect(() => {
    registerPageContext({
      pageType: "syllabus-edit",
      label: params.label,
      subject: params.subject,
      classTitle: params.classTitle,
      getCurrentInfo: () => getCurrentInfoRef.current() || {},
      formSyllabus: params.formSyllabus,
      applyFieldSuggestion: (fieldLabel, suggestion) => {
        const fields = extractSyllabusInputFields(params.formSyllabus);
        const meta = fields.find(
          (f) => f.name === fieldLabel || f.id === fieldLabel
        );
        const key = meta?.id || fieldLabel;
        const next = { ...getCurrentInfoRef.current(), [key]: suggestion };
        if (meta?.name && meta.name !== key && meta.name in next) {
          delete next[meta.name];
        }
        onApplyInfoRef.current(next);
      },
      applyInfoDraft: (values) => {
        const fields = extractSyllabusInputFields(params.formSyllabus);
        const current = { ...getCurrentInfoRef.current() };
        let applied = 0;
        let skipped = 0;
        for (const [fieldLabel, raw] of Object.entries(values || {})) {
          const value = String(raw ?? "").trim();
          if (!value) {
            skipped += 1;
            continue;
          }
          const meta = fields.find(
            (f) => f.name === fieldLabel || f.id === fieldLabel
          );
          const key = meta?.id || fieldLabel;
          current[key] = value;
          if (meta?.name && meta.name !== key && meta.name in current) {
            delete current[meta.name];
          }
          applied += 1;
        }
        if (applied > 0) onApplyInfoRef.current(current);
        return { applied, skipped };
      },
      suggestedSkills: ["syllabus-draft", "chat"],
    });
    return () => registerPageContext(null);
  }, [
    params.label,
    subjectKey,
    params.classTitle,
    params.formSyllabus,
    params.subject,
    registerPageContext,
  ]);
};

export default useRegisterAlterSyllabus;
