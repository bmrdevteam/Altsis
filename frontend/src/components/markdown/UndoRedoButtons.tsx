import { Editor } from "@tiptap/react";
import Svg from "assets/svg/Svg";
import style from "./markdown.module.scss";

type Props = {
  editor: Editor;
};

/** 서식·표·이미지 툴바에서 같은 실행 취소/다시 실행 버튼을 쓴다. */
const UndoRedoButtons = ({ editor }: Props) => {
  const canUndo = editor.can().undo();
  const canRedo = editor.can().redo();

  return (
    <>
      <button
        type="button"
        title="실행 취소"
        aria-label="실행 취소"
        disabled={!canUndo}
        onClick={() => editor.chain().focus().undo().run()}
        className={`${style.toolbarBtn} ${
          canUndo ? "" : style.toolbarBtnDisabled
        }`}
      >
        <Svg type="undo" width="18px" height="18px" />
      </button>
      <button
        type="button"
        title="다시 실행"
        aria-label="다시 실행"
        disabled={!canRedo}
        onClick={() => editor.chain().focus().redo().run()}
        className={`${style.toolbarBtn} ${
          canRedo ? "" : style.toolbarBtnDisabled
        }`}
      >
        <Svg type="redo" width="18px" height="18px" />
      </button>
    </>
  );
};

export default UndoRedoButtons;
