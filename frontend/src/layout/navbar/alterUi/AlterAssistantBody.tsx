import { MarkdownViewer } from "components/markdown";
import normalizeAlterMarkdown from "utils/normalizeAlterMarkdown";
import DraftPreviewShell from "./DraftPreviewShell";
import DraftRichBody from "./DraftRichBody";
import { hasInteractiveFence, looksLikeDocumentHtml } from "./draftPreview";
import style from "../Alter.module.scss";

type Props = {
  content: string;
  className?: string;
};

export const AlterAssistantBody = ({ content, className }: Props) => {
  const normalized = normalizeAlterMarkdown(content);
  const hasFence = hasInteractiveFence(normalized);
  const isDoc = looksLikeDocumentHtml(normalized);
  const viewer = (
    <MarkdownViewer
      content={normalized}
      className={className || style.mdContent}
      escapeRawHtml={!isDoc}
      allowHtmlApp={hasFence}
    />
  );

  if (!isDoc && !hasFence) return viewer;

  return (
    <DraftPreviewShell
      title="응답 미리보기"
      meta={{
        label: hasFence ? "앱" : "문서",
        variant: "neutral",
      }}
      source={<pre>{normalized}</pre>}
    >
      {isDoc && !hasFence ? <DraftRichBody content={normalized} /> : viewer}
    </DraftPreviewShell>
  );
};

export default AlterAssistantBody;
