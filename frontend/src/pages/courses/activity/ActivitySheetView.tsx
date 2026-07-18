import AltSheetView from "pages/boards/altBoard/AltSheetView";
import { TAltForm } from "types/altForm";
import { TBoard } from "types/board";

type Props = {
  board: TBoard;
  form: TAltForm;
  canManage?: boolean;
  canDeleteAnyRow?: boolean;
};

const ActivitySheetView = ({
  board,
  form,
  canManage = true,
  canDeleteAnyRow = false,
}: Props) => {
  return (
    <AltSheetView
      board={board}
      forms={[form]}
      canManage={canManage}
      canDeleteAnyRow={canDeleteAnyRow}
      initialFormId={form._id}
    />
  );
};

export default ActivitySheetView;
