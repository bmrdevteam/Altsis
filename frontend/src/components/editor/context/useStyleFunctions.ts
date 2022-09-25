/**
 * @file useStyleFunctions hook
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
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
 * - useStyleFunctions component
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 *
 * use var tags or span tags for data
 */

import { useEffect, useState } from "react";

/**
 * styles function
 *
 * @returns styleFunctions
 *
 * @version 2.0 stashed all functions related to execommands {@link https://developer.mozilla.org/ko/docs/Web/API/Document/execCommand} - deprecated
 * @version 1.0 initial version
 */
export default function useStyleFunctions() {
  let currentBlockId = "";
  let currentBlockType = "";


  function setCurrentBlockId(id: string) {
    currentBlockId = id;
    console.log(id);

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
  function underline() {}
  function strikeThrough() {}
  function overline() {}
  function color() {}
  function backgroundColor() {}

  function align(x: "left" | "center" | "right") {
    getParentElement()?.focus();

    console.log(document.activeElement);
    if (getParentElement() !== undefined) {
      getParentElement()!.style.textAlign = x;
    }
    getParentElement()?.focus();
  }
  function handleKeyDown(e: KeyboardEvent) {
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
    test,
    _init,
    bold,
    align,
    setCurrentBlockType,
    setCurrentBlockId,
    currentBlock,
    handleKeyDown,
  };
}
