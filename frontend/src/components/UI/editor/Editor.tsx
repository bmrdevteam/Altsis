import React from "react";
import style from "./editor.module.scss";
import EditorBlock from "./EditorBlock";
import Table from "./items/table/EditorTable";
import Text from "./items/text/editorText";
import EditorMenu from "./menu/EditorMenu";

type Props = {};

const Editor = (props: Props) => {
  return (
    <div className={style.editor_container} style={{ margin: "24px" }}

    >
      <EditorBlock>
        <Text>asdfasdf</Text>
      </EditorBlock>
      <EditorBlock>
        <Table />
      </EditorBlock>
      <EditorMenu/>
    </div>
  );
};

export default Editor;
