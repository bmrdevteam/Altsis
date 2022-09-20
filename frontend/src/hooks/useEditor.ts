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
 */

import _, { isArray } from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { IBlock } from "../components/editor/type";

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
export default function useEditor(onUpdate: () => void ) {
  /**
   *  state for the whole editor data
   */
  const [editorData, setEditorData] = useState<any>();
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
    return blockDataRef.current;
  }

  /**
   * sets the initial data for the editor
   *
   * @param data
   */

  function initalData(data: any) {
    setEditorData(data);
    if (data === undefined || !isArray(data)) {
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
    return _.findIndex(blockDataRef.current, { id: id });
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
    const q = () => {
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
    blockDataRef.current = q();
    setBlockDataUpdate(true);
  }

  function deleteBlock(blockId: string) {
    blockDataRef.current = blockDataRef.current.filter((value: any) => {
      return value.id !== blockId;
    });
    setBlockDataUpdate(true);
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
   * save editor
   * @param {Function}
   */
  function save(saveFuntion: any) {
    saveFuntion();
  }

  return {
    addBlock,
    deleteBlock,
    saveBlock,
    save,
    result,
    getBlockIndex,
    focusBlock,
    initalData,

  };
}
