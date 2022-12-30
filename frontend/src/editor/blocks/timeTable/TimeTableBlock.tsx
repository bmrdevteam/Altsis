import React from "react";
import { useEditor } from "../../functions/editorContext";
import style from "../../editor.module.scss";

type Props = { index: number };

function TimeTableBlock(props: Props) {
  const { getBlock } = useEditor();
  return <div className={style.block}>
    <table></table>
  </div>;
}

export default TimeTableBlock;
