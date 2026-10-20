import { applyLabelForDraft, isApplyDisabled } from "./draftUi";
import { TAlterDraftResult } from "./types";
import style from "../Alter.module.scss";

type Props = {
  draft: TAlterDraftResult;
  applied: boolean;
  onClick: () => void;
  visible?: boolean;
  label?: string;
};

const ApplyDraftButton = ({
  draft,
  applied,
  onClick,
  visible = true,
  label,
}: Props) => {
  if (!visible) return null;
  return (
    <button
      type="button"
      className={style.applyBtn}
      disabled={isApplyDisabled(draft, applied)}
      onClick={onClick}
    >
      {label || applyLabelForDraft(draft, applied)}
    </button>
  );
};

export default ApplyDraftButton;
