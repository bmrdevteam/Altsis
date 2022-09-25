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
import {
  IBlock,
  IHeadingBlock,
  IInputBlock,
  IParagraphBlock,
  ITimetableBlock,
} from "./type";
import style from "./editor.module.scss";
import TimetableBlock from "./blocks/TimetableBlock";
import { useEditorFunctions } from "./context/editorContext";
import Input from "../input/Input";

const Block = ({
  data,
  editorId,
  contextMenuController,
}: {
  data: IBlock;
  editorId: string;
  contextMenuController: any;
}) => {
  const { editor } = useEditorFunctions();

  const block = data as IParagraphBlock;

  const Block = ({ children }: { children?: JSX.Element }) => {
    let classNameArr: string[] = [style.block];
    if (block.type === "table") {
      classNameArr.push(style.table);
    }
    if (block.type === "divider") {
      classNameArr.push(style.divider);
    }

    return (
      <div
        id={`${editorId}-${data.id}`}
        className={classNameArr.join(" ")}
        placeholder={"입력"}
        data-divide-count={1}
        contentEditable
        suppressContentEditableWarning
        onInput={(e: any) => {
          editor.saveBlock({
            block: {
              id: block.id,
              type: block.type,
              data: { text: e.target.innerHTML },
            },
            update: false,
          });
        }}
        onKeyDown={(e: any) => {
          // styleFunctions.handleKeyDown(e);

          if (e.key === "Tab") {
            e.preventDefault();
          }
          if (e.key === "Enter") {
            e.preventDefault();
            editor.addBlock({
              insertAfter: editor.getBlockIndex(block.id) + 1,
            });

            editor.saveBlock({
              block: {
                id: block.id,
                type: block.type,
                data: { text: e.target.innerHTML },
              },
            });
          }

          if (
            editor.result().length > 1 &&
            e.key === "Backspace" &&
            e.target.innerText === ""
          ) {
            editor.deleteBlock(block.id);
          }
        }}
        // onContextMenu={(e) => {
        //   e.preventDefault();
        //   contextMenuController({
        //     position: [e.pageX, e.pageY],
        //     ref: e,
        //     blockId: block.id,
        //   });
        // }}
        dangerouslySetInnerHTML={{ __html: block.data.text }}
      ></div>
    );
  };

  switch (data.type) {
    case "input":
      return <Input label="입력의 이름을 정해주세요" required/>;
    default:
      return <Block />;
  }
};

export default Block;
