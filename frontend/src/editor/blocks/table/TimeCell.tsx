
import style from "../../editor.module.scss";
import { useEditor } from "../../functions/editorContext";

type Props = {
  blockIndex: number;
  column: number;
  row: number;
};

const TimeCell = (props: Props) => {
  const { saveCell, getCell } = useEditor();
  const cell = getCell(props.blockIndex, props.row, props.column);

  return (
    <div className={style.cell} style={{ textAlign: cell?.align }}>
      00:00
    </div>
  );
};

export default TimeCell;
