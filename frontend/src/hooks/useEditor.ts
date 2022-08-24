import React, { useEffect, useState } from "react";
import { IBlock } from "../components/editor/type";

export default function useEditor() {
  const [editorData, setEditorData] = useState<any>();
  const [blockData, setBlockData] = useState<any>();
  const [auth, setAuth] = useState();

  useEffect(() => {
    return () => {};
  }, []);

  function result() {
    return blockData;
  }

  function initalData(data: any) {
    setEditorData(data);
    if (data.data === undefined) {
      setBlockData([{ id: "initialBlock", type: "paragraph", data: {text:"inital"} }]);
    } else {
      setBlockData(data.data);
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
    let block = {
      id: generateId(12),
      type: blockType ? blockType : "paragraph",
      data: blockData ? blockData : { text: "asdfa" },
    };

    setBlockData((prev: any) => {
      if (prev === undefined || prev === null) {
        return [block];
      }

      //if insertAfter is not undefined and higher than zero
      if (insertAfter !== undefined && insertAfter > 0) {
        return [
          // the front half of the array
          ...prev.slice(0, insertAfter),
          // inserting the block
          block,
          // the back half of the array
          ...prev.slice(insertAfter, prev.length),
        ];
      }
      if (insertAfter !== undefined && insertAfter <= 0) {
        return [block, ...prev];
      }

      return [...prev, block];
    });
  }

  function deleteBlock(blockId: string) {
    setBlockData((prev: any) => {
      return prev.filter((value: any) => {
        return value.id !== blockId;
      });
    });
  }
  /**
   * save editor
   * @param {Function}
   */
  function save(saveFuntion: any) {
    saveFuntion();
  }
  function autoSave() {}

  return { addBlock, deleteBlock, save, result, editorData, initalData };
}
