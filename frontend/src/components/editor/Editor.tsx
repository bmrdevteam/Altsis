import { useEffect } from "react";
import Block from "./Block";
import style from "./editor.module.scss";

import { IBlock } from "./type";

interface Props {
  auth: "read" | "edit";
  editorhook: any;
  initalData?: any;
  autoSave?: boolean;
}

const Editor = (props: Props) => {
  useEffect(() => {
    return () => {};
  }, []);

  return (
    <div className={style.editor}>
      {props.editorhook.result()?.map((value: IBlock, index: number) => {
        return (
          <Block
          editorFunctions={props.editorhook}
            editorId={props.editorhook.editorData?.id}
            data={value}
            key={index}
          />
        );
      })}
    </div>
  );
};

export default Editor;
