import { useEffect, useRef } from "react";
import {
  TAlterFormResponseDraft,
  useAlter,
} from "contexts/alterContext";
import { TAltFormField } from "types/altForm";
import {
  applyFormResponseByField,
  isFormResponseWritableType,
  TFormResponseFieldMeta,
  TFormResponseUserCandidate,
} from "utils/formResponseDraft";
import {
  clipText,
  finalizeChatSnapshot,
} from "utils/alterChatSnapshot";

type Params = {
  enabled?: boolean;
  label?: string;
  boardId?: string;
  boardName?: string;
  formId?: string;
  formTitle?: string;
  fields: TAltFormField[];
  data: Record<string, unknown>;
  setValue: (fieldId: string, value: unknown) => void;
  userCandidates?: TFormResponseUserCandidate[];
};

/**
 * 양식 응답(compose) 화면에서 Navbar Alter에 응답 초안 문맥을 등록한다.
 */
const useRegisterAlterFormResponse = (params: Params) => {
  const { registerPageContext } = useAlter();
  const fieldsRef = useRef(params.fields);
  const dataRef = useRef(params.data);
  const setValueRef = useRef(params.setValue);
  const candidatesRef = useRef(params.userCandidates || []);
  fieldsRef.current = params.fields;
  dataRef.current = params.data;
  setValueRef.current = params.setValue;
  candidatesRef.current = params.userCandidates || [];

  useEffect(() => {
    if (params.enabled === false || !params.formId) return;

    return registerPageContext({
      pageType: "form-response",
      label:
        params.label ||
        (params.formTitle
          ? `${params.boardName || ""} · ${params.formTitle}`.trim()
          : "양식 응답"),
      boardId: params.boardId,
      boardName: params.boardName,
      getChatSnapshot: (opts) => {
        const fields = fieldsRef.current || [];
        const data = dataRef.current || {};
        const itemFields: Record<string, string> = {};
        const cellCap = opts?.dataExpand ? 800 : 300;
        for (const f of fields) {
          if (f.type === "content" || f.type === "approval") continue;
          const clipped = clipText(data[f._id], cellCap);
          if (clipped) itemFields[f.label || f._id] = clipped;
          else itemFields[f.label || f._id] = "(비어 있음)";
        }
        return finalizeChatSnapshot(
          {
            summary: `양식 응답 — ${params.formTitle || params.label || "양식"}`,
            items: [
              {
                title: params.formTitle || "응답",
                fields: itemFields,
              },
            ],
            totalCount: fields.length,
          },
          { dataExpand: opts?.dataExpand }
        );
      },
      getFormResponse: () => {
        const fields = fieldsRef.current || [];
        const data = dataRef.current || {};
        return {
          formId: params.formId || "",
          formTitle: params.formTitle || "",
          boardName: params.boardName,
          fields: fields.map((f) => ({
            fieldId: f._id,
            label: f.label,
            type: f.type,
            permission: f.permission,
            options: f.options,
            template: f.content,
            validation: f.validation as
              | { min?: number; max?: number }
              | undefined,
            currentValue: data[f._id],
          })),
          responses: { ...data },
          userCandidates: candidatesRef.current,
        };
      },
      applyFormResponseDraft: (draft: TAlterFormResponseDraft) => {
        const fields = (fieldsRef.current || [])
          .filter((f) => isFormResponseWritableType(f.type))
          .map(
            (f): TFormResponseFieldMeta => ({
              fieldId: f._id,
              label: f.label,
              type: f.type,
              options: f.options,
              template: f.content,
              validation: f.validation as
                | { min?: number; max?: number }
                | undefined,
            })
          );
        return applyFormResponseByField({
          byField: (draft?.byField || {}) as Record<string, unknown>,
          fields,
          current: dataRef.current || {},
          userCandidates: candidatesRef.current,
          fillEmptyOnly: !!draft?.fillEmptyOnly,
          setValue: setValueRef.current,
        });
      },
      suggestedSkills: ["form-response-draft", "chat"],
    });
  }, [
    params.enabled,
    params.label,
    params.boardId,
    params.boardName,
    params.formId,
    params.formTitle,
    registerPageContext,
  ]);
};

export default useRegisterAlterFormResponse;
