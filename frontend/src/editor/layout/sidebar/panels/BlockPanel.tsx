import React from "react";
import Svg from "../../../../assets/svg/Svg";
import style from "../../../editor.module.scss";
import useEditorStore from "../../../store/useEditorStore";
import Menu from "../Menu";

const BlockPanel = () => {
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const blocks = useEditorStore((s) => s.blocks);
  const addBlock = useEditorStore((s) => s.addBlock);
  const getBlockIndex = useEditorStore((s) => s.getBlockIndex);

  const selectedIndex = selectedBlockId ? getBlockIndex(selectedBlockId) : -1;

  const handleAddBlock = (blockType: string) => {
    addBlock({
      blockType: blockType as any,
      insertAfterIndex: selectedIndex >= 0 ? selectedIndex + 1 : blocks.length,
    });
  };

  return (
    <Menu name="블록">
      <div className={style.item}>
        <div className={style.add_block}>
          <div
            className={style.option}
            onClick={() => handleAddBlock("paragraph")}
            title="텍스트"
          >
            <Svg type={"text"} />
          </div>
          <div
            className={style.option}
            onClick={() => handleAddBlock("table")}
            title="테이블"
          >
            <Svg type={"table"} />
          </div>
          <div
            className={style.option}
            onClick={() => handleAddBlock("divider")}
            title="구분선"
          >
            <Svg type={"minus"} />
          </div>
          <div
            className={style.option}
            onClick={() => handleAddBlock("image")}
            title="이미지"
          >
            <Svg type={"image"} />
          </div>
        </div>
      </div>
    </Menu>
  );
};

export default BlockPanel;
