import React from "react";
import Block from "../blocks/Block";
import style from "../editor.module.scss";
import useEditorStore from "../store/useEditorStore";

const Content = () => {
  const blocks = useEditorStore((s) => s.blocks);
  const mode = useEditorStore((s) => s.mode);
  const sidebarOpen = useEditorStore((s) => s.sidebarOpen);
  const selectBlock = useEditorStore((s) => s.selectBlock);

  const handleContentClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).id === "editorPage") {
      selectBlock(null);
    }
  };

  return (
    <div
      className={`${style.content_container} ${mode === "preview" ? style.preview : ""}`}
      style={{
        width:
          mode === "edit" && sidebarOpen ? "calc(100% - 280px)" : "100%",
      }}
    >
      <div
        className={style.page}
        id={"editorPage"}
        onClick={handleContentClick}
      >
        {blocks.map((block, index: number) => (
          <Block key={block.id} blockId={block.id} index={index} />
        ))}
      </div>
      <div className={style.page_background}>
        <div className={style.background}></div>
      </div>
    </div>
  );
};

export default Content;
