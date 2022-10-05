import React from "react";
import { useEditor } from "../../functions/editorContext";
import style from "../../editor.module.scss";

type Props = {
  index: number;
};

const DataTableBlock = (props: Props) => {
  const { getBlock } = useEditor();

  console.log(getBlock(props.index));

  return <div className={style.block}>DataTableBlock</div>;
};

export default DataTableBlock;
