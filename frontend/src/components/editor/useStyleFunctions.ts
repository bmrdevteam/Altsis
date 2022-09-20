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
 * - useStyleFunctions component
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 *
 * use var tags or span tags for data
 */

import { useState } from "react";
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

  function setCurrentBlockId(id: string) {
    currentBlockId = id;
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
   * @returns boolean value whether the parentNode only contains text nodes
   *
   */
  function onlyTextNode() {
    let result: boolean = true;
    getParentElement()?.childNodes.forEach((element) => {
      if (element.nodeName !== "#text") {
        result = false;
      }
    });

    return result;
  }
  /**
   *
   * @returns Range object at current selection
   *
   */
  function getRange() {
    let range = null;
    if (window.getSelection()?.toString() !== "") {
      range = window.getSelection()?.getRangeAt(0);
    }
    return range;
  }
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
    console.log(getRange()?.startOffset);
  }

  /**
   * bold
   */
  
  function bold() {
    _init();

    // for (let i = 0; i < getParentElement()!.childNodes.length; i++) {
    //   console.log(getParentElement()?.childNodes[i].nodeName);
    // }
  }

  function align(x: "left" | "center" | "right") {
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
  }

  return { test, _init, bold, align, setCurrentBlockId, handleKeyDown };
}
