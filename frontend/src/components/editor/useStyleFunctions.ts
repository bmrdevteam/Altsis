import { useState } from "react";

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

  function bold() {

    
  }

  function align(x: "left" | "center" | "right") {
    if (getParentElement() !== undefined) {
      getParentElement()!.style.textAlign = x;
    }
  }

  return { test, _init, bold, align, setCurrentBlockId };
}
