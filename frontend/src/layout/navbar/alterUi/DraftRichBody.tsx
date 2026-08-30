import { MarkdownWysiwygView } from "components/markdown";
import { redactImagesForPreview } from "utils/formResponseSlots";
import style from "../Alter.module.scss";

type Props = {
  content: string;
  className?: string;
};

const DraftRichBody = ({ content, className }: Props) => {
  const text = redactImagesForPreview(content || "");
  if (!text) return null;
  return (
    <div
      className={`${style.draftRichBody}${className ? ` ${className}` : ""}`}
    >
      <MarkdownWysiwygView content={text} />
    </div>
  );
};

export default DraftRichBody;
