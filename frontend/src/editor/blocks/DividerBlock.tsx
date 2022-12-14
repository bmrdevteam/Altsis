import React from "react";
import style from "../editor.module.scss";

type Props = { index: number };

const DividerBlock = (props: Props) => {
  return (
    <div className={`${style.block} ${style.line}`} contentEditable={false}>
      <div className={style.line}></div>
    </div>
  );
};

export default DividerBlock;
