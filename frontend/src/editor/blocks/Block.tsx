import React from "react";
import useEditorStore from "../store/useEditorStore";
import style from "../editor.module.scss";
import ParagraphBlock from "./ParagraphBlock";
import TableBlock from "./table/TableBlock";
import InputBlock from "./InputBlock";
import DataTableBlock from "./dataTable/DataTableBlock";
import TimeTableBlock from "./timeTable/TimeTableBlock";
import DividerBlock from "./DividerBlock";
import ImageBlock from "./ImageBlock";

type Props = { blockId: string; index: number };

const Block = (props: Props) => {
  const block = useEditorStore((s) => s.blocks[props.index]);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const mode = useEditorStore((s) => s.mode);
  const setDraggedBlockIndex = useEditorStore((s) => s.setDraggedBlockIndex);

  if (!block) return null;

  const isSelected = selectedBlockId === block.id;
  const isEditMode = mode === "edit";

  const blockContent = () => {
    switch (block.type) {
      case "paragraph":
        return <ParagraphBlock blockId={block.id} index={props.index} />;
      case "table":
        return <TableBlock blockId={block.id} index={props.index} />;
      case "divider":
        return <DividerBlock blockId={block.id} index={props.index} />;
      case "timetable":
        return <TimeTableBlock index={props.index} />;
      case "input":
        return <InputBlock blockId={block.id} index={props.index} />;
      case "image":
        return <ImageBlock blockId={block.id} index={props.index} />;
      default:
        return <ParagraphBlock blockId={block.id} index={props.index} />;
    }
  };

  return (
    <div
      id={block.id}
      className={`${style.block_wrapper} ${isSelected ? style.selected : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        selectBlock(block.id);
      }}
      style={{ width: `${(block.data as any)?.width ?? 100}%` }}
    >
      {isEditMode && (
        <div
          className={style.drag_handle}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(props.index));
            setDraggedBlockIndex(props.index);
            const wrapper = (e.currentTarget as HTMLElement).parentElement;
            if (wrapper) {
              setTimeout(() => {
                wrapper.style.opacity = "0.4";
              }, 0);
            }
          }}
          onDragEnd={(e) => {
            const wrapper = (e.currentTarget as HTMLElement).parentElement;
            if (wrapper) wrapper.style.opacity = "1";
            setDraggedBlockIndex(null);
          }}
        >
          ⠿
        </div>
      )}
      {blockContent()}
    </div>
  );
};

export default React.memo(Block);
