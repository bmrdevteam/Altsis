import React from "react";
import style from "../../editor.module.scss";
import useEditorStore from "../../store/useEditorStore";
import BlockPanel from "./panels/BlockPanel";
import TableCellPanel from "./panels/TableCellPanel";
import CellTypePanel from "./panels/CellTypePanel";
import ParagraphPanel from "./panels/ParagraphPanel";
import InputPanel from "./panels/InputPanel";
import ImagePanel from "./panels/ImagePanel";
import Menu from "./Menu";

const TitlePanel = () => {
  const title = useEditorStore((s) => s.title);
  const setTitle = useEditorStore((s) => s.setTitle);

  return (
    <Menu name="제목">
      <div className={style.grid_item}>
        <label>제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
        />
      </div>
    </Menu>
  );
};

const Sidebar = () => {
  const selectedBlock = useEditorStore((s) => {
    if (!s.selectedBlockId) return null;
    return s.blocks.find((b) => b.id === s.selectedBlockId) ?? null;
  });
  const cellPos = useEditorStore((s) => s.selectedCellPosition);
  const cellRange = useEditorStore((s) => s.selectedCellRange);

  const blockType = selectedBlock?.type;
  const hasCell = blockType === "table" && (cellPos !== null || cellRange !== null);

  return (
    <div className={style.sidebar_container}>
      <div className={style.sidebar}>
        <TitlePanel />
        <BlockPanel />
        {blockType === "table" && <TableCellPanel />}
        {hasCell && <CellTypePanel />}
        {blockType === "paragraph" && <ParagraphPanel />}
        {blockType === "input" && <InputPanel />}
        {blockType === "image" && <ImagePanel />}
      </div>
    </div>
  );
};

export default Sidebar;
