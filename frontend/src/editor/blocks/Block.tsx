import React from "react";
import { useEditor } from "../functions/editorContext";
import style from "../editor.module.scss";
import ParagraphBlock from "./ParagraphBlock";
import TableBlock from "./table/TableBlock";
import InputBlock from "./InputBlock";
import DataTableBlock from "./dataTable/DataTableBlock";
import TimeTableBlock from "./timeTable/TimeTableBlock";
import DividerBlock from "./DividerBlock";

type Props = { index: number };

const Block = (props: Props) => {
  const { getBlock, setCurrentBlock } = useEditor();

  const block = getBlock(props.index);

  const Wrapper = ({ children }: { children: JSX.Element }) => {
    return (
      <div
        id={block.id}
        onClick={() => {
          setCurrentBlock(block.id);
        }}
        onFocus={() => {
          //
        }}
        style={{ width: `${block.data.width ?? 100}%` }}
      >
        {children}
      </div>
    );
  };

  switch (block.type) {
    case "paragraph":
      return (
        <Wrapper>
          <ParagraphBlock index={props.index} />
        </Wrapper>
      );
    case "table":
      return (
        <Wrapper>
          <TableBlock index={props.index} />
        </Wrapper>
      );
    case "divider":
      return (
        <Wrapper>
          <DividerBlock index={props.index} />
        </Wrapper>
      );
    case "timetable":
      return (
        <Wrapper>
          <TimeTableBlock index={props.index} />
        </Wrapper>
      );
    case "input":
      return (
        <Wrapper>
          <InputBlock index={props.index} />
        </Wrapper>
      );
    default:
      return (
        <Wrapper>
          <ParagraphBlock index={props.index} />
        </Wrapper>
      );
  }
};

export default Block;
