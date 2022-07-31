import { useEffect, useRef, useState } from "react";
import Block from "./Block";
import style from "./editor.module.scss";
import useEditor from "./hooks/useEditor";
import AppearanceMenu from "./menu/AppearanceMenu";
import { testData } from "./test/testData";
import { IBlock } from "./types/dataTypes";

function Editor() {
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // dev test data

  const editor = useEditor(testData.blocks as IBlock[]);

  // const [editorData,setEditorData] = useState(null)
  return (
    <div
      className={style.editor_container}
      style={{ height: "100vh", overflow: "scroll" }}
      ref={editorContainerRef}
    >
      <div className={style.editor} id="editor">
        <AppearanceMenu containerRef={editorContainerRef} />
        {editor.editorData.map((block, index) => {
          return (
            <Block
              key={index}
              editorId={testData.id}
              data={block as IBlock}
              editor={editor}
            />
          );
        })}
      </div>
    </div>
  );
}

export default Editor;
