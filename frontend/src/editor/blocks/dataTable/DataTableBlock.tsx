import React from "react";
import style from "../../editor.module.scss";

type Props = {
  index: number;
};

const DataTableBlock = (props: Props) => {
  return <div className={style.block}>DataTableBlock</div>;
};

export default DataTableBlock;
