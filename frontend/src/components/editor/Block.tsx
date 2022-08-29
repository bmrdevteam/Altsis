import React, { useEffect, useState } from "react";

import DividerBlock from "./blocks/DividerBlock";
import HeadingBlock from "./blocks/HeadingBlock";
import InputBlock from "./blocks/InputBlock";
import Paragraphblock from "./blocks/ParagraphBlock";
import TableBlock from "./blocks/TableBlock";
import {
  IBlock,
  IHeadingBlock,
  IInputBlock,
  IParagraphBlock,
  ITimetableBlock,
} from "./type";
import style from "./editor.module.scss";
import TimetableBlock from "./blocks/TimetableBlock";

const Block = ({
  data,
  editorId,
  editorFunctions,
  contextMenuController,
}: {
  data: IBlock;
  editorId: string;
  editorFunctions: any;
  contextMenuController: any;
}) => {
  useEffect(() => {
    return () => {};
  }, []);

  const Wrapper = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
    
    
    
    return (
      <div
        id={`${editorId}-${data.id}`}
        className={style.block}
        onContextMenu={(e) => {
          e.preventDefault();
          contextMenuController({ position: [e.pageX, e.pageY] });
        }}
      >
        {children}
      </div>
    );
  };

  switch (data.type) {
    case "heading":
      return (
        <Wrapper>
          <HeadingBlock block={data as IHeadingBlock} />
        </Wrapper>
      );

    case "paragraph":
      return (
        <Wrapper>
          <Paragraphblock
            block={data as IParagraphBlock}
            editorFunctions={editorFunctions}
          />
        </Wrapper>
      );
    case "divider":
      return (
        <Wrapper>
          <DividerBlock />
        </Wrapper>
      );
    case "table":
      return (
        <Wrapper>
          <TableBlock />
        </Wrapper>
      );
    case "input":
      return (
        <Wrapper>
          <InputBlock block={data as IInputBlock} />
        </Wrapper>
      );
    case "timetable":
      return (
        <Wrapper>
          <TimetableBlock block={data as ITimetableBlock} />
        </Wrapper>
      );
    default:
      break;
  }
  return (
    <Wrapper>
      <div></div>
    </Wrapper>
  );
};

export default Block;
