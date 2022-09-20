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

  function getRange() {
    let range = null;
    if (window.getSelection()?.toString() !== "") {
      range = window.getSelection()?.getRangeAt(0);
    }
    return range;
  }
  function getParentElement() {
    if (window.getSelection()?.toString() !== "" && currentBlockId) {
      return document.getElementById(currentBlockId) as HTMLDivElement;
    }

    return undefined;
  }

  function test() {
    return;
  }

  function _init() {}

  function bold() {}

  function align(x: "left" | "center" | "right") {
    if (getParentElement() !== undefined) {
      getParentElement()!.style.textAlign = x;
    }
  }

  return { test, _init, bold, align, setCurrentBlockId };
}
