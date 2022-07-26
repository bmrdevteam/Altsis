import React from "react";
import Svg from "../../assets/svg/Svg";
import style from "./editor.module.scss";

const EditorBlock = ({ children }: { children: JSX.Element }) => {
  return (
    <div className={style.editor_block}>
      <div className={style.dots}>
        <Svg width="24px" height="24px" type="horizontalDots" />
      </div>
      <div
        onContextMenu={(e) => {
          e.preventDefault();
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default EditorBlock;
