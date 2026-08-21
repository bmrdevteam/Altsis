import { useEffect, useRef } from "react";
import { useAlter, TAlterFormDraft } from "contexts/alterContext";
import {
  clipText,
  finalizeChatSnapshot,
} from "utils/alterChatSnapshot";
import { applyFormDraftToBlocks } from "utils/formDraftApply";
import { EditorBlock } from "editor/types";

type Params = {
  enabled?: boolean;
  label?: string;
  formId?: string;
  formType?: string;
  getForm: () => {
    formId: string;
    title: string;
    formType: string;
    blocks: EditorBlock[];
  };
  applyFormDraft?: (next: {
    title: string;
    blocks: EditorBlock[];
  }) => { applied: boolean };
};

const formTypeLabel = (formType?: string) =>
  formType === "timetable"
    ? "시간표"
    : formType === "syllabus"
      ? "강의계획서"
      : formType === "print"
        ? "출력"
        : "양식";

/**
 * 관리자 양식 목록/에디터에서 Navbar Alter에 양식 초안 문맥을 등록한다.
 */
const useRegisterAlterForm = (params: Params) => {
  const { registerPageContext } = useAlter();
  const getFormRef = useRef(params.getForm);
  const applyRef = useRef(params.applyFormDraft);
  getFormRef.current = params.getForm;
  applyRef.current = params.applyFormDraft;

  useEffect(() => {
    if (params.enabled === false) return;

    return registerPageContext({
      pageType: "form-editor",
      label:
        params.label ||
        `${formTypeLabel(params.formType)} 양식`,
      getChatSnapshot: (opts) => {
        const cur = getFormRef.current();
        const blocks = cur.blocks || [];
        const cap = opts?.dataExpand ? 20 : 8;
        const lines = blocks.slice(0, cap).map((b, i) => {
          if (b.type === "table") {
            const table = (b.data as { table?: unknown[][] })?.table || [];
            return `${i + 1}. 표 ${table.length}행 × ${table[0]?.length || 0}열`;
          }
          if (b.type === "paragraph") {
            return `${i + 1}. 텍스트 ${clipText(
              String((b.data as { text?: string })?.text || ""),
              80
            )}`;
          }
          return `${i + 1}. ${b.type}`;
        });
        return finalizeChatSnapshot(
          {
            summary: `관리자 양식 — ${cur.title || params.label || "양식"}`,
            items: [
              {
                title: String(cur.title || "(제목 없음)"),
                fields: {
                  유형: formTypeLabel(cur.formType),
                  블록: lines.join("\n") || "(없음)",
                  블록수: String(blocks.length),
                },
              },
            ],
            totalCount: 1,
            isPartial: blocks.length > cap,
          },
          { dataExpand: opts?.dataExpand }
        );
      },
      getForm: () => {
        const cur = getFormRef.current();
        return {
          formId: String(cur.formId || ""),
          title: String(cur.title || ""),
          formType: cur.formType || "other",
          blocks: cur.blocks || [],
        };
      },
      applyFormDraft: applyRef.current
        ? (draft: TAlterFormDraft) => {
            const cur = getFormRef.current();
            const result = applyFormDraftToBlocks(
              { title: cur.title, blocks: cur.blocks || [] },
              draft
            );
            if (!result.applied) return { applied: false };
            return (
              applyRef.current?.({
                title: result.title,
                blocks: result.blocks,
              }) || { applied: false }
            );
          }
        : undefined,
      suggestedSkills: ["form-draft", "chat"],
    });
  }, [
    params.enabled,
    params.label,
    params.formId,
    params.formType,
    registerPageContext,
  ]);
};

export default useRegisterAlterForm;
