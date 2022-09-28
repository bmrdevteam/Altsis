/**
 * @file useEditor hook
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * - useEditor hook
 *   - addBlock()
 *   - deleteBlock()
 *   - saveBlock()
 *   - save()
 *   - result()
 *   - getBlockIndex()
 *   - focusBlock()
 *   - editorData()
 *   - initalData()
 *
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 * https://stackoverflow.com/questions/2234979/how-to-check-in-javascript-if-one-element-is-contained-within-another
 *
 */

import _, { isArray } from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { IBlock } from "../type";

/**
 *
 * @returns a editor hook to control functions in the editor
 *
 * @example
 *
 * @version 2.0 changed the rendering method with (useRef and useState)
 * @version 1.0 initial version
 *
 *
 */
export default function useEditor(onUpdate: () => any) {
  /**
   *  state for the whole editor data
   */
  // const [editorData, setEditorData] = useState<any>();
  /**
   * ref object containing blocks
   * [
   *  {block1},
   *  {block2},
   *  {block3}
   *  ...
   * ]
   */
  const blockDataRef = useRef<any>(null);
  /**
   * state containing blocks
   *
   */
  const [blockData, setBlockData] = useState<any>();

  const [blockDataUpdate, setBlockDataUpdate] = useState(false);

  const [auth, setAuth] = useState();

  useEffect(() => {
    if (blockDataUpdate) {
      setBlockDataUpdate(false);
    }
  }, [blockDataUpdate]);

  function result() {
    onUpdate();
    console.log("called result");
    return blockDataRef.current;
  }

  /**
   * sets the initial data for the editor
   *
   * @param data
   */

  function initalData(data: any) {
    // setEditorData(data);
    if (data === undefined || !isArray(data) || data[0].id === undefined) {
      setBlockData([
        { id: "initialBlock", type: "paragraph", data: { text: "" } },
      ]);
      blockDataRef.current = [
        { id: "initialBlock", type: "paragraph", data: { text: "" } },
      ];
    } else {
      setBlockData(data.filter((val: any) => val.id !== undefined));
      blockDataRef.current = data.filter((val: any) => val.id !== undefined);
    }
    setBlockDataUpdate(true);
  }

  function getBlockIndex(id: string) {
    if (id) {
      return _.findIndex(blockDataRef.current, {
        id: id.split("-")[id.split("-").length - 1],
      });
    }
  }
  function getBlock(id: string) {
    if (id) {
      return blockDataRef.current.filter(
        (val: any) => val.id === id.split("-")[id.split("-").length - 1]
      )[0];
    }
  }

  function focusBlock(index: number | string) {
    if (typeof index === "number") {
      console.log(blockData[index]?.id);
    } else {
      console.log(getBlockIndex(index));
    }
  }

  function generateId(length: number) {
    var result = "";
    var characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result as string;
  }

  function addBlock({
    insertAfter,
    blockType,
    blockData,
  }: {
    insertAfter?: number;
    blockType?: string;
    blockData?: any;
  }) {
    const blockId = generateId(12);
    let block = {
      id: blockId,
      type: blockType ? blockType : "paragraph",
      data: blockData ? blockData : { text: "" },
    };
    blockDataRef.current = () => {
      if (blockDataRef.current.length === 0) {
        return [block];
      }
      if (insertAfter !== undefined && insertAfter > 0) {
        return [
          // the front half of the array
          ...blockDataRef.current.slice(0, insertAfter),
          // inserting the block
          block,
          // the back half of the array
          ...blockDataRef.current.slice(insertAfter),
        ];
      }
      if (insertAfter !== undefined && insertAfter <= 0) {
        return [block, ...blockDataRef.current];
      }
      return [...blockDataRef.current, block];
    };

    setBlockDataUpdate(true);
  }

  function deleteBlock(blockId: string) {
    blockDataRef.current = blockDataRef.current.filter((value: any) => {
      return value.id !== blockId;
    });
    setBlockDataUpdate(true);
  }

  function changeBlockType({
    blockId,
    type,
  }: {
    blockId: string;
    type: string;
  }) {
    if ((getBlockIndex(blockId) as number) >= 0) {
      if (
        blockDataRef.current[getBlockIndex(blockId) as number].type !== type
      ) {
        blockDataRef.current[getBlockIndex(blockId) as number].type = type;
        console.log(blockDataRef.current[getBlockIndex(blockId) as number]);
        setBlockDataUpdate(true);
      }
    }
  }
  function changeBlockData({ blockId, data }: { blockId: string; data: any }) {
    if ((getBlockIndex(blockId) as number) >= 0) {
      Object.assign(
        blockDataRef.current[getBlockIndex(blockId) as number].data,
        data
      );

      console.log(blockDataRef.current[getBlockIndex(blockId) as number]);

      setBlockDataUpdate(true);
    }
  }

  function saveBlock({ block, update }: { block: IBlock; update?: boolean }) {
    if (!(_.findIndex(blockDataRef.current, { id: block.id }) < 0)) {
      blockDataRef.current = [
        ...blockDataRef.current.slice(
          0,
          _.findIndex(blockDataRef.current, { id: block.id })
        ),
        block,
        ...blockDataRef.current.slice(
          _.findIndex(blockDataRef.current, { id: block.id }) + 1,
          blockDataRef.current.length
        ),
      ];
      if (update || update === undefined) {
        setBlockDataUpdate(true);
      }
    }
  }

  /**
   * -------------------------------------------------------------------
   */

  let currentBlockId = "";
  let currentBlockType = "";

  function setCurrentBlockId(id: string) {
    currentBlockId = id;
  }
  function setCurrentBlockType(type: string) {
    currentBlockType = type;
  }

  const styleAttributes = [
    "fontWeight",
    "fontStyle",
    "fontSize",
    "textDecoration",
    "color",
    "backgroundColor",
  ];

  function currentBlock() {
    return { currentBlockId, currentBlockType };
  }

  // function insertHTML() {
  //   let sel, range;
  //   if (window.getSelection && (sel = window.getSelection()).rangeCount) {
  //     range = sel.getRangeAt(0);
  //     range.collapse(true);
  //     var span = document.createElement("span");
  //     span.id = "myId";
  //     span.appendChild(document.createTextNode("hi"));
  //     range.insertNode(span);

  //     // Move the caret immediately after the inserted span
  //     range.setStartAfter(span);
  //     range.collapse(true);
  //     sel.removeAllRanges();
  //     sel.addRange(range);
  //   }
  // }

  /**
   *
   * @returns the parent element (using the currentBlock id) as a HTMLDivElement
   */
  function getParentElement() {
    if (currentBlockId) {
      return document.getElementById(currentBlockId) as HTMLDivElement;
    }
  }
  /**
   *
   * @returns Range object at current selection
   *
   */
  function getRange() {
    let range = undefined;
    if (window.getSelection && window.getSelection()?.toString() !== "") {
      range = window.getSelection()?.getRangeAt(0);
    }
    return range;
  }

  /**
   * function for tests
   * @returns
   */
  function test() {
    console.log(getParentElement()?.innerHTML);

    return;
  }
  /**
   * function to run before styling
   *
   */
  function _init() {
    let array: any[] = [];

    let prevSpanAtrr = "";

    getParentElement()?.childNodes.forEach((element: any) => {
      let span = document.createElement("span");
      let spanAttr = "";
      /**
       * current styles
       */
      spanAttr += element.id;
      if (element.nodeName !== "#text") {
        for (let i = 0; i < styleAttributes.length; i++) {
          spanAttr += `${styleAttributes[i]}:${
            element.style[styleAttributes[i]]
          }`;
        }
      } else {
        array[array.length - 1].textContent =
          array[array.length - 1].textContent + element.textContent;
      }

      if (spanAttr === prevSpanAtrr && array.length > 0) {
        array[array.length - 1].textContent =
          array[array.length - 1].textContent + element.textContent;
      } else {
        if (element.nodeName !== "#text") {
          for (let i = 0; i < styleAttributes.length; i++) {
            span.style[styleAttributes[i] as any] =
              element.style[styleAttributes[i]];
          }
        }
        if (element.innerHTML !== "" || element.innerHTML !== undefined) {
          span.textContent = element.textContent;
          array.push(span);
        }
      }
      /**
       * reset the prev styles
       */
      prevSpanAtrr = "";
      /**
       * set prev styles
       */
      prevSpanAtrr = spanAttr;
    });

    getParentElement()!.innerHTML = "";

    for (let i = 0; i < array.length; i++) {
      getParentElement()?.appendChild(array[i]);
    }
    return array;
  }

  /**
   * bold
   */

  function bold() {
    _init();
    // console.log(getRange());
  }
  function italic() {
    let startContainerReached = false;
    let endContainerElementReached = false;
    const range = getRange();
    const startContainer = range?.startContainer;
    const startOffset = range?.startOffset;
    const endContainer = range?.endContainer;
    const endOffset = range?.endOffset;
    console.log(range);

    getParentElement()?.childNodes.forEach((element: any) => {
      const elementText = element.textContent;
      if (startContainer?.parentElement !== endContainer?.parentElement) {
        if (element === startContainer?.parentElement) {
          startContainerReached = true;

          if (startOffset !== 0) {
            let span = document.createElement("span");
            span.textContent = elementText.slice(0, startOffset);
            element.before(span);
          }

          element.style.fontStyle = "italic";
          element.textContent = elementText.slice(
            startOffset,
            elementText.length
          );
        } else if (element === endContainer?.parentElement) {
          endContainerElementReached = true;
          let span = document.createElement("span");

          span.textContent = elementText.slice(0, endOffset);
          span.style.fontStyle = "italic";

          element.before(span);

          if (endOffset !== elementText.length) {
            element.textContent = elementText.slice(
              endOffset,
              elementText.length
            );
          } else {
            element.remove();
          }
        } else if (!startContainerReached !== !endContainerElementReached) {
          console.log("middle", element);
          element.style.fontStyle = "italic";
        }
      } else {
        /**
         * if the startcontainer and the end container are the same element
         */
        if (startContainer?.parentElement === element) {
          if (
            (endOffset as number) - (startOffset as number) ===
            elementText.length
          ) {
            /**
             * if the selection covers the whole element
             * apply style to the element
             */
            element.style.fontStyle = "italic";
          } else {
            if (startOffset !== 0) {
              let span = document.createElement("span");
              span.textContent = elementText.slice(0, startOffset);
              element.before(span);
            }

            // element.fontStyle = "italic";
            // element.textContent = elementText.slice(startOffset, endOffset);
            console.log(window.getSelection()?.anchorNode);

            // if (endOffset !== elementText.length) {
            //   let span = document.createElement("span");

            //   span.style.fontStyle = "italic";
            //   span.textContent = elementText.slice(
            //     endOffset,
            //     elementText.length
            //   );
            //   element.before(span);
            // } else {
            //   // element.remove();
            // }
          }
        }
      }
    });

    // _init();
  }
  // function underline() {}
  // function strikeThrough() {}
  // function overline() {}
  // function color() {}
  // function backgroundColor() {}

  function align(x: "left" | "center" | "right") {
    console.log(currentBlockId);
    if (getParentElement() !== undefined) {
      getParentElement()!.style.textAlign = x;
    }
    getParentElement()?.focus();
  }
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Tab") {
      e.preventDefault();
    }
    if (e.key === "Enter") {
   e.preventDefault()
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      bold();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      italic();
    }
  }

  return {
    initalData,
    onUpdate,

    result,
    addBlock,
    deleteBlock,
    saveBlock,

    // setAuth,
    setBlockDataUpdate,

    getBlockIndex,
    getBlock,

    changeBlockType,
    changeBlockData,
    // focusBlock,

    bold,
    align,
    setCurrentBlockType,
    setCurrentBlockId,
    currentBlock,
    handleKeyDown,
  };
}
