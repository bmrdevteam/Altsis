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

  if (!block) return null;

  const isSelected = selectedBlockId === block.id;

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

  const wrapperWidth = (block.data as any)?.width ?? 100;

  // For image blocks, calculate margin based on alignment
  const getWrapperMargin = () => {
    if (block.type !== "image") return undefined;
    const alignment = (block.data as any)?.alignment || "center";
    if (alignment === "left") return "0 auto 0 0";
    if (alignment === "right") return "0 0 0 auto";
    return "0 auto"; // center
  };

  return (
    <div
      id={block.id}
      className={`${style.block_wrapper} ${isSelected ? style.selected : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        selectBlock(block.id);
      }}
      style={{ width: `${wrapperWidth}%`, margin: getWrapperMargin() }}
    >
      {blockContent()}
    </div>
  );
};

export default React.memo(Block);
