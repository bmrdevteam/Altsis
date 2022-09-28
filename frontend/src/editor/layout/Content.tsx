import React, { useEffect, useState } from "react";
import Block from "../blocks/Block";
import style from "../editor.module.scss";
import { useEditor } from "../functions/editorContext";
type Props = {
  reloadHook: (
    setCounterState: React.Dispatch<React.SetStateAction<any>>
  ) => void;
};

const Content = (props: Props) => {
  const { result, editorPageRef } = useEditor();

  const [counter, setCounter] = useState<number>(0);
  props.reloadHook(setCounter);

  return (
    <div className={style.content_container}>
      {/* {!reloadEditorData && ( */}
      {/* <div>{counter}</div> */}

      <div className={style.page} id={"editorPage"} ref={editorPageRef}>
        {result().map((value, index: number) => {
          return <Block key={index} index={index} />;
        })}
      </div>
      {/* )} */}
      <div className={style.page_background}>
        <div className={style.background}></div>
      </div>
    </div>
  );
};

export default Content;
