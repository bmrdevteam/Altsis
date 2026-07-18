import AltFormRenderer from "pages/boards/altBoard/AltFormRenderer";
import { TBoard } from "types/board";

type Props = {
  board: TBoard;
  formId: string;
  onBack: () => void;
};

const ActivityFormRenderer = ({ board, formId, onBack }: Props) => {
  return <AltFormRenderer board={board} formId={formId} onBack={onBack} />;
};

export default ActivityFormRenderer;
