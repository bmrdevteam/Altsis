import React from "react";
import style from "../editor.module.scss";

type Props = { blockId: string; index: number };

const DividerBlock = (_props: Props) => {
  return (
    <div className={`${style.block} ${style.line}`} contentEditable={false}>
      <div className={style.line}></div>
    </div>
  );
};

export default React.memo(DividerBlock);
