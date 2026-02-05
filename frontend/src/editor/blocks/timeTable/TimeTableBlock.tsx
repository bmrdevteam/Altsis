import React from "react";
import style from "../../editor.module.scss";

type Props = { index: number };

function TimeTableBlock(props: Props) {
  return (
    <div className={style.block}>
      <table></table>
    </div>
  );
}

export default TimeTableBlock;
