import React from "react";
import style from './editor.module.scss'

const EditorBlock = ({ children }: { children: JSX.Element }) => {
  return <div className={style.editor_block}>{children}</div>;
};

export default EditorBlock;
