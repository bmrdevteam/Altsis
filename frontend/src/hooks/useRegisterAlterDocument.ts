import { useEffect, useRef } from "react";
import { useAlter } from "contexts/alterContext";
import { normalizeDocumentDraftContent } from "utils/documentDraftMarkdown";
import {
  ALTER_CHAT_SNAPSHOT_LIMITS,
  clipText,
  finalizeChatSnapshot,
} from "utils/alterChatSnapshot";

type Params = {
  enabled?: boolean;
  label?: string;
  boardId?: string;
  boardName?: string;
  getDocument: () => { title: string; content: string };
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
};

/**
 * 보드 문서 작성/수정 화면에서 Navbar Alter에 문서 초안 문맥을 등록한다.
 */
const useRegisterAlterDocument = (params: Params) => {
  const { registerPageContext } = useAlter();
  const getDocumentRef = useRef(params.getDocument);
  const setTitleRef = useRef(params.setTitle);
  const setContentRef = useRef(params.setContent);
  getDocumentRef.current = params.getDocument;
  setTitleRef.current = params.setTitle;
  setContentRef.current = params.setContent;

  useEffect(() => {
    if (params.enabled === false) return;

    return registerPageContext({
      pageType: "document",
      label: params.label || params.boardName || "문서 작성",
      boardId: params.boardId,
      boardName: params.boardName,
      getChatSnapshot: (opts) => {
        const doc = getDocumentRef.current() || { title: "", content: "" };
        const content = clipText(
          doc.content,
          ALTER_CHAT_SNAPSHOT_LIMITS.DOCUMENT_CHARS
        );
        return finalizeChatSnapshot(
          {
            summary: `보드 문서 — ${params.boardName || params.label || "문서"}`,
            items: [
              {
                title: String(doc.title || "(제목 없음)"),
                fields: content ? { 본문: content } : {},
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
      getDocument: () => {
        const doc = getDocumentRef.current() || { title: "", content: "" };
        return {
          title: String(doc.title || ""),
          content: String(doc.content || ""),
          boardName: params.boardName,
        };
      },
      getReviewDocument: () => {
        const doc = getDocumentRef.current() || { title: "", content: "" };
        return {
          title: String(doc.title || ""),
          content: String(doc.content || ""),
          fieldNames: [],
        };
      },
      applyDocumentDraft: (draft) => {
        const nextContent = normalizeDocumentDraftContent(
          String(draft?.content ?? "")
        );
        if (!nextContent.trim()) {
          return { applied: false };
        }
        setContentRef.current(nextContent);
        const nextTitle = String(draft?.title ?? "").trim();
        if (nextTitle) {
          setTitleRef.current(nextTitle);
        }
        return { applied: true };
      },
      suggestedSkills: ["document-draft", "document-review", "chat"],
    });
  }, [
    params.enabled,
    params.label,
    params.boardId,
    params.boardName,
    registerPageContext,
  ]);
};

export default useRegisterAlterDocument;
