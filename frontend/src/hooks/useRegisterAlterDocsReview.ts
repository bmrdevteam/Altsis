import { useEffect, useRef } from "react";
import { useAlter } from "contexts/alterContext";
import {
  serializeDocsForReview,
  TDocsReviewSnapshot,
} from "pages/docs/serializeDocsForReview";
import {
  ALTER_CHAT_SNAPSHOT_LIMITS,
  clipText,
  finalizeChatSnapshot,
} from "utils/alterChatSnapshot";

type Params = {
  enabled?: boolean;
  label?: string;
  formTitle?: string;
  studentLabel?: string;
  /** 현재 선택된 인쇄 양식 템플릿 (화면 표시 필드 기준 직렬화에 필요) */
  getFormData?: () => any;
  getDbData: () => any;
};

/**
 * 문서함(인쇄 양식) 화면에서 Navbar Alter에 문서 점검 문맥을 등록한다.
 * 점검 대상은 선택 양식에 바인딩되어 화면에 표시되는 필드만 포함한다.
 */
const useRegisterAlterDocsReview = (params: Params) => {
  const { registerPageContext } = useAlter();
  const getFormDataRef = useRef(params.getFormData ?? (() => undefined));
  const getDbDataRef = useRef(params.getDbData);
  getFormDataRef.current = params.getFormData ?? (() => undefined);
  getDbDataRef.current = params.getDbData;

  useEffect(() => {
    if (params.enabled === false) return;

    return registerPageContext({
      pageType: "docs",
      label: params.label || params.formTitle || "문서 점검",
      getChatSnapshot: (opts) => {
        const doc = serializeDocsForReview({
          formTitle: params.formTitle,
          studentLabel: params.studentLabel,
          formData: getFormDataRef.current(),
          dbData: getDbDataRef.current(),
        });
        const content = clipText(
          doc.content,
          ALTER_CHAT_SNAPSHOT_LIMITS.DOCUMENT_CHARS
        );
        return finalizeChatSnapshot(
          {
            summary: `문서함 — ${doc.title || params.formTitle || "문서"}${
              params.studentLabel ? ` · ${params.studentLabel}` : ""
            }`,
            items: [
              {
                title: String(doc.title || "(제목 없음)"),
                fields: content ? { 내용: content } : {},
              },
            ],
            totalCount: 1,
            isPartial:
              String(doc.content || "").length >
              ALTER_CHAT_SNAPSHOT_LIMITS.DOCUMENT_CHARS,
          },
          { dataExpand: opts?.dataExpand }
        );
      },
      getReviewDocument: (): TDocsReviewSnapshot =>
        serializeDocsForReview({
          formTitle: params.formTitle,
          studentLabel: params.studentLabel,
          formData: getFormDataRef.current(),
          dbData: getDbDataRef.current(),
        }),
      suggestedSkills: ["document-review", "chat"],
    });
  }, [
    params.enabled,
    params.label,
    params.formTitle,
    params.studentLabel,
    registerPageContext,
  ]);
};

export default useRegisterAlterDocsReview;
