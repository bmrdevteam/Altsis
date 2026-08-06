import { applyLabelForDraft, isApplyDisabled } from "./draftUi";
import { TAlterDraftResult } from "./types";
import style from "../Alter.module.scss";

type Props = {
  draft: TAlterDraftResult;
  applied: boolean;
  onClick: () => void;
  visible?: boolean;
};

const ApplyDraftButton = ({
  draft,
  applied,
  onClick,
  visible = true,
}: Props) => {
  if (!visible) return null;
  return (
    <button
      type="button"
      className={style.applyBtn}
      disabled={isApplyDisabled(draft, applied)}
      onClick={onClick}
    >
      {applyLabelForDraft(draft, applied)}
    </button>
  );
};

export default ApplyDraftButton;
