export type FormDraftSendArgs = {
  pageType?: string;
  hasEditorApply?: boolean;
  writeMode?: "create" | "refine";
  hasText?: boolean;
  hasAttachments?: boolean;
  hasBlocks?: boolean;
};

/**
 * Off the form editor the message still goes to the server.
 * The editor keeps the existing empty-draft checks.
 */
export const formDraftSendBlock = ({
  pageType,
  hasEditorApply = false,
  writeMode = "create",
  hasText = false,
  hasAttachments = false,
  hasBlocks = false,
}: FormDraftSendArgs): string | null => {
  if (pageType !== "form-editor") return null;
  if (!hasEditorApply) return "양식 문서를 연 뒤 초안을 작성할 수 있습니다.";
  if (writeMode === "create" && !hasText && !hasAttachments) {
    return "초안에 쓸 정보를 입력하거나 파일을 첨부해 주세요.";
  }
  if (writeMode === "refine" && !hasBlocks && !hasText && !hasAttachments) {
    return "다듬을 양식이 없습니다. 에디터에 내용을 쓰거나 요청을 입력해 주세요.";
  }
  return null;
};
