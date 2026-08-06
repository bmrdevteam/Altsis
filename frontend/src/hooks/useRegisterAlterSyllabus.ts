import { useEffect, useRef } from "react";
import { useAlter } from "contexts/alterContext";
import { extractSyllabusInputFields } from "utils/syllabusAiFields";
import {
  clipText,
  finalizeChatSnapshot,
} from "utils/alterChatSnapshot";

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
    return registerPageContext({
      pageType: "syllabus-edit",
      label: params.label,
      subject: params.subject,
      classTitle: params.classTitle,
      getCurrentInfo: () => getCurrentInfoRef.current() || {},
      getChatSnapshot: () => {
        const info = getCurrentInfoRef.current() || {};
        const fields = extractSyllabusInputFields(params.formSyllabus);
        const itemFields: Record<string, string> = {};
        for (const f of fields) {
          const key = f.id || f.name;
          const val = info[key] ?? (f.name ? info[f.name] : undefined);
          const clipped = clipText(val, 500);
          if (clipped) itemFields[f.name || key] = clipped;
        }
        for (const [k, v] of Object.entries(info)) {
          if (itemFields[k] != null) continue;
          const clipped = clipText(v, 500);
          if (clipped) itemFields[k] = clipped;
        }
        return finalizeChatSnapshot({
          summary: `강의계획서 작성 중 — ${params.classTitle || "(수업명 미입력)"}`,
          items: [
            {
              title: params.classTitle || params.label || "강의계획서",
              fields: {
                교과: params.subject.join(" > "),
                ...itemFields,
              },
            },
          ],
          totalCount: 1,
        });
      },
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
