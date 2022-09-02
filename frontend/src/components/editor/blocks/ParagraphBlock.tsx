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
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {}, [divRef]);

  return (
    <div
      ref={divRef}
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
        if (e.key === "Backspace" && e.target.innerText === "") {
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
      // onSelect={(e) => {
      //   console.log(
      //     window.getSelection()?.toString() !== ""
      //       ? window.getSelection()?.getRangeAt(0).getBoundingClientRect()
      //       : "bluff"
      //   );
      // }}
      dangerouslySetInnerHTML={{ __html: block.data.text }}
    ></div>
  );
};

export default Paragraphblock;
