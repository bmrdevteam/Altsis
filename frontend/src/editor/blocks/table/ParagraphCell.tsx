import React from "react";
import style from "../../editor.module.scss";
type Props = {};

const ParagraphCell = (props: Props) => {
  return (
    <div contentEditable suppressContentEditableWarning className={style.cell}>
      ParagraphCell
    </div>
  );
};

export default ParagraphCell;
