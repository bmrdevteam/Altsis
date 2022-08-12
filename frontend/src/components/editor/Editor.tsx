import { useEffect } from "react";
import Block from "./Block";
import { EditorProvider, useEditorData } from "./context/editorContext";
import style from "./editor.module.scss";
import { IBlock } from "./type";
type Props = {
  auth: "read" | "edit";
  initalData?: any;
  autoSave?: boolean;
};

const EditorInner = ({ props }: { props: Props }) => {
  const { editorData, SetAuth, editor } = useEditorData();

  useEffect(() => {
    SetAuth(props.auth);

    //if there is no inital data create a new editor
    if (props.initalData === null || props.initalData === undefined) {
      editor.create();
    }
    
    if (props.autoSave) {
    }
    return () => {};
  }, []);
  console.log(editorData);

  return (
    <div className={style.editor}>
      {editorData?.blocks.map((value: IBlock, index: number) => {
        return <Block editorId={editorData.id} data={value} key={index} />;
      })}
    </div>
  );
};

const Editor = (props: Props) => {
  return (
    <EditorProvider>
      <EditorInner props={props} />
    </EditorProvider>
  );
};

export default Editor;
