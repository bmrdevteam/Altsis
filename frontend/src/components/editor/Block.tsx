/**
 * @file Block component for the editor
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * - Block component
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 */

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
  styleFunctions,
}: {
  data: IBlock;
  editorId: string;
  editorFunctions: any;
  contextMenuController: any;
  styleFunctions: any;
}) => {
  useEffect(() => {
    return () => {};
  }, []);
  const block = data as IParagraphBlock;

  const Wrapper = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
    return (
      <div
        id={`${editorId}-${data.id}`}
        className={style.block}
        placeholder={"입력"}
        contentEditable
        suppressContentEditableWarning
        onInput={(e: any) => {
          editorFunctions.saveBlock({
            block: {
              id: block.id,
              type: block.type,
              data: { text: e.target.innerHTML },
            },
            update: false,
          });
        }}
        onKeyDown={(e: any) => {
          // console.log(e.key);

          if (e.key === "Tab") {
            e.preventDefault();
          }
          if (e.key === "Enter") {
            e.preventDefault();
            editorFunctions.addBlock({
              insertAfter: editorFunctions.getBlockIndex(block.id) + 1,
            });

            editorFunctions.saveBlock({
              block: {
                id: block.id,
                type: block.type,
                data: { text: e.target.innerHTML },
              },
            });
          }

          if (
            editorFunctions?.result().length > 1 &&
            e.key === "Backspace" &&
            e.target.innerText === ""
          ) {
            editorFunctions.deleteBlock(block.id);
          }
        }}
        onSelect={() => {
          console.log(`${editorId}-${data.id}`);
          styleFunctions.setCurrentBlockId(`${editorId}-${data.id}`);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          contextMenuController({
            position: [e.pageX, e.pageY],
            ref: e,
            blockId: block.id,
          });
        }}
        dangerouslySetInnerHTML={{ __html: block.data.text }}
      ></div>
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
