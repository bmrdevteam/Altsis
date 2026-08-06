import { useEffect, useRef } from "react";
import { useAlter } from "contexts/alterContext";
import { normalizeDocumentDraftContent } from "utils/documentDraftMarkdown";

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
    if (params.enabled === false) {
      registerPageContext(null);
      return () => registerPageContext(null);
    }

    registerPageContext({
      pageType: "document",
      label: params.label || params.boardName || "문서 작성",
      boardId: params.boardId,
      boardName: params.boardName,
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

    return () => registerPageContext(null);
  }, [
    params.enabled,
    params.label,
    params.boardId,
    params.boardName,
    registerPageContext,
  ]);
};

export default useRegisterAlterDocument;
