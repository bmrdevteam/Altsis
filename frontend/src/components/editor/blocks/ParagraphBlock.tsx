import { useEffect, useRef } from "react";
import style from "../editor.module.scss";
import { IParagraphBlock } from "../type";

const Paragraphblock = ({
  block,
  editorFunctions,
}: {
  block: IParagraphBlock;
  editorFunctions: any;
}) => {


  return (
    <div
      className={style.paragraph}
      placeholder={"입력"}
      contentEditable
      suppressContentEditableWarning
      onKeyDown={(e: any) => {
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
      onClick={() => {
        console.log();
      }}
      dangerouslySetInnerHTML={{ __html: block.data.text }}
    ></div>
  );
};

export default Paragraphblock;
