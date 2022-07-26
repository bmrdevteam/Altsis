
import Block from "./Block";
import style from "./editor.module.scss";
import AppearanceMenu from "./menu/AppearanceMenu";
import { testData } from "./test/testData";
import { IBlock } from "./types/dataTypes";

function Editor() {
  

  return (
    <div className={style.editor} id="editor">
      <AppearanceMenu/>
      {testData.blocks.map((block, index) => {
        return (
          <Block key={index} editorId={testData.id} data={block as IBlock} />
        );
      })}
    </div>
  );
}

export default Editor;
