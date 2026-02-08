import React from "react";
import style from "../../editor.module.scss";
import useEditorStore from "../../store/useEditorStore";
import BlockPanel from "./panels/BlockPanel";
import TableCellPanel from "./panels/TableCellPanel";
import ParagraphPanel from "./panels/ParagraphPanel";
import InputPanel from "./panels/InputPanel";
import ImagePanel from "./panels/ImagePanel";

const Sidebar = () => {
  const selectedBlock = useEditorStore((s) => {
    if (!s.selectedBlockId) return null;
    return s.blocks.find((b) => b.id === s.selectedBlockId) ?? null;
  });

  const blockType = selectedBlock?.type;

  return (
    <div className={style.sidebar_container}>
      <div className={style.sidebar}>
        <BlockPanel />
        {blockType === "table" && <TableCellPanel />}
        {blockType === "paragraph" && <ParagraphPanel />}
        {blockType === "input" && <InputPanel />}
        {blockType === "image" && <ImagePanel />}
      </div>
    </div>
  );
};

export default Sidebar;
