import _, { isArray, isEmpty } from "lodash";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import Loading from "../../components/loading/Loading";
import useGenerateId from "../../hooks/useGenerateId";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

const EditorContext = createContext<any>(null);

interface IBlock {
  id: string;
  type: string;
  data: any;
}

export function useEditor(): {
  editorTitle: string | undefined;
  saveEditorData: () => Promise<void>;
  reloadEditorData: boolean;
  editorPageRef: React.RefObject<HTMLDivElement>;
  setReloadEditorData: React.Dispatch<React.SetStateAction<boolean>>;
  addBlock: ({
    insertAfter,
    blockType,
    blockData,
  }: {
    insertAfter?: number | undefined;
    blockType?: string | undefined;
    blockData?: any;
  }) => void;
  saveBlock: ({
    block,
    update,
  }: {
    block: IBlock;
    update?: boolean | undefined;
  }) => void;
  handleChangeEditorTitle: (e: any) => void;
  handleChangeEditorType: (e: any) => void;
  setCurrentBlock: (id: string) => void;
  copyBlockAfterCurrentBlock: (data: any) => void;
  getCurrentBlock: () => any;
  removeCurrentBlock: () => void;
  upCurrentBlock: () => void;
  downCurrentBlock: () => void;
  changeCurrentBlockType: (type: string) => void;
  changeCurrentBlockData: (data: any) => void;
  addBlockAfterCurrentBlock: (blockType: string) => void;
  changeBlockData: (blockIndex: number, data: any) => void;
  result: () => Array<any>;
  getBlock: (blockIndex: number) => any;
  changeCurrentCell: (data: any) => {};
  changeCurrentCellType: () => void;
  setCurrentCellColumn: (ratio: number) => void;
  setCurrentCell: (id: string) => void;
  setCurrentCellIndex: (row: number, col: number) => void;
  getCurrentCellColumn: () => number;
  getCurrentCell: () => any;
  saveCell: (
    blockIndex: number,
    row: number,
    column: number,
    data: any
  ) => void;
  getCell: (blockIndex: number, row: number, column: number) => any;
  getCurrentCellIndex: () => {
    id: any;
    row: any;
    column: any;
  };
  addToCurrentRow: () => void;
  addToCurrentColumn: () => void;
  removeCurrentColumn: () => void;
  removeCurrentRow: () => void;
} {
  return useContext(EditorContext);
}
/**
 *
 * @param props
 *
 * @returns
 */
export const EditorProvider = (props: {
  id: string;
  children: JSX.Element;
}) => {
  /**
   * database hook
   */
  const { FormAPI } = useAPIv2();
  const generateId = useGenerateId;

  /**
   * loading state for the whole element
   */
  const [loading, setLoading] = useState<boolean>(true);

  const [editorTitle, setEditorTitle] = useState<string>();
  const [editorType, setEditorType] = useState<string>();

  /**
   * set preview state
   */
  const [previewActivated, setPreviewActivated] = useState<boolean>(false);

  /**
   * editor data
   */
  const editorData = useRef<any>(null);
  /**
   * editor data Moves
   */
  const editorDataMoves = useRef<any>([]);
  const editorDataMovesTrack = useRef<number>(0);
  const editorDataMovesLimit = 100;
  /**
   * editor page ref
   */
  const editorPageRef = useRef<HTMLDivElement>(null);

  /**
   * get the form data from the backend
   * @async
   */
  async function getEditorData() {
    try {
      const { form } = await FormAPI.RForm({ params: { _id: props.id } });
      return form;
    } catch (err) {
      ALERT_ERROR(err);
    }
  }

  /**
   * save the form data to the backend
   */
  async function saveEditorData() {
    if (!(editorType === "timetable")) {
      try {
        await FormAPI.UForm({
          params: { _id: props.id },
          data: {
            title: editorTitle ?? "undefined",
            data: result(),
          },
        });
        alert(SUCCESS_MESSAGE);
      } catch (err) {
        ALERT_ERROR(err);
      }
    } else {
      parseTimeBlocks();

      try {
        await FormAPI.UForm({
          params: { _id: props.id },
          data: {
            title: editorTitle ?? "undefined",
            data: result(),
            // timeBlocks: parseTimeBlocks(),
          },
        });
        alert(SUCCESS_MESSAGE);
      } catch (err) {
        ALERT_ERROR(err);
      }
    }
  }

  /** timeBlock parsing */
  function parseTimeBlocks() {
    let timeBlockOutputarr = [];
    const tableData: any[] = result().filter((block: any) => {
      return block.type === "table";
    })[0].data.table;
    for (let i = 0; i < tableData.length; i++) {
      const row = tableData[i];
      for (let ii = 0; ii < row.length; ii++) {
        const cell = row[ii];
        if (cell.type === "checkbox") {
          timeBlockOutputarr.push({
            label: cell.name,
            start: row[0].timeRangeStart,
            end: row[0].timeRangeEnd,
          });
        }
      }
    }
    return timeBlockOutputarr;
  }

  /**
   * --------------------------------------------------------------------
   *
   * running hooks
   *
   * --------------------------------------------------------------------
   *
   */
  /**
   * componentDidMount
   */
  useEffect(() => {
    getEditorData().then((res) => {
      setEditorTitle(res.title);
      setEditorType(res.type);
      _init(res.data);

      setLoading(false);
    });

    /**
     * clean up
     */
    return () => {};
  }, []);

  /**
   * reloader
   */
  const [reloadEditorData, setReloadEditorData] = useState<boolean>(false);
  useEffect(() => {
    if (reloadEditorData) {
      setReloadEditorData(false);
    }
  }, [reloadEditorData]);

  /**
   * --------------------------------------------------------------------
   *
   * functions for controlling the editor type and title
   *
   * --------------------------------------------------------------------
   */
  function handleChangeEditorTitle(e: any) {
    setEditorTitle(e.target.value);
  }
  function handleChangeEditorType(e: any) {
    setEditorType(e.target.value);
  }

  /**
   * --------------------------------------------------------------------
   *
   * functions for controlling the editorData
   *
   * --------------------------------------------------------------------
   *
   */

  /**
   * initial function to prepare the editor data
   */
  function _init(data: any) {
    if (isArray(data) && data[0]?.id !== undefined) {
      /**
       * filter any unwanted data
       */
      editorData.current = data.filter((val: any) => val.id !== undefined);
    } else {
      /**
       * if the given data from the backend is null,undefined
       * set a dummy block
       */
      editorData.current = [
        {
          id: `${props.id}-initialBlock`,
          type: "paragraph",
          data: { text: "" },
        },
      ];
    }
  }

  /**
   * returns the editor data
   *
   * @returns editorData
   */
  function result(): Array<any> {
    return editorData.current;
  }

  function addBlock({
    insertIndex,
    blockType,
    blockData,
  }: {
    insertIndex?: number;
    blockType?: string;
    blockData?: any;
  }) {
    const blockId = generateId(12);
    let block = {
      id: `${props.id}-${blockId}`,
      type: blockType ? blockType : "paragraph",
      data: blockData
        ? blockData
        : {
            text: "",

            table: [
              [
                {
                  id: `${blockId}-${generateId(12)}`,
                  data: { text: "" },
                  type: "paragraph",
                },
              ],
            ],
          },
    };
    if (blockType === "table") {
      block = {
        id: `${props.id}-${blockId}`,
        type: "table",
        data: blockData
        ? blockData
        : {
          columns: [1, 1, 1],
          table: [
            [
              {
                id: `${blockId}-${generateId(12)}`,
                data: { text: "" },
                type: "paragraph",
              },
              {
                id: `${blockId}-${generateId(12)}`,
                data: { text: "" },
                type: "paragraph",
              },
              {
                id: `${blockId}-${generateId(12)}`,
                data: { text: "" },
                type: "paragraph",
              },
            ],
            [
              {
                id: `${blockId}-${generateId(12)}`,
                data: { text: "" },
                type: "paragraph",
              },
              {
                id: `${blockId}-${generateId(12)}`,
                data: { text: "" },
                type: "paragraph",
              },
              {
                id: `${blockId}-${generateId(12)}`,
                data: { text: "" },
                type: "paragraph",
              },
            ],
          ],
        },
      };
    }
    // console.log("inserting after", insertIndex);

    const q = () => {
      if (editorData.current.length === 0) {
        return [block];
      }
      if (insertIndex !== undefined && insertIndex > 0) {
        return [
          // the front half of the array
          ...editorData.current.slice(0, insertIndex),
          // inserting the block
          block,
          // the back half of the array
          ...editorData.current.slice(insertIndex),
        ];
      }
      if (insertIndex !== undefined && insertIndex <= 0) {
        return [block, ...editorData.current];
      }
      return [...editorData.current, block];
    };
    editorData.current = q();
    setReloadEditorData(true);
    saveMoves();
  }

  function saveBlock({ block, update }: { block: IBlock; update?: boolean }) {
    if (!(_.findIndex(editorData.current, { id: block.id }) < 0)) {
      Object.assign(
        editorData.current[_.findIndex(editorData.current, { id: block.id })],
        block
      );

      if (update || update === undefined) {
        setReloadEditorData(true);
      }
      // console.log("updated", editorData.current);
    }
    saveMoves();
  }

  /**
   * --------------------------------------------------------------------
   *
   * functions for controlling specific blocks
   *
   * --------------------------------------------------------------------
   */

  const currentBlockId = useRef<any>(null);

  function setCurrentBlock(id: string) {
    if (currentBlockId.current !== id) {
      currentBlockId.current = id;
    }
  }

  function copyBlockAfterCurrentBlock(data: any) {
  // 현재 블록 데이터를 깊은 복사
  const blockData = JSON.parse(
    JSON.stringify(editorData.current[getCurrentBlockIndex()].data)
  );

  // `table` 내부의 id 값을 모두 새로 생성
  blockData.table = blockData.table.map((row: any[]) =>
    row.map((cell) => ({
      ...cell,
      id: `${cell.id.slice(0,12)}-${generateId(12)}`, // 새로운 ID 생성
    }))
  );
    addBlock({
      insertIndex: getCurrentBlockIndex() + 1,
      blockType: editorData.current[getCurrentBlockIndex()].type,
      blockData: blockData,
    });
  }

  function getCurrentBlockIndex() {
    return _.findIndex(editorData.current, { id: currentBlockId.current });
  }

  function getCurrentBlock() {
    return editorData.current[getCurrentBlockIndex()];
  }
  function removeCurrentBlock() {
    editorData.current.splice(getCurrentBlockIndex(), 1);
    setReloadEditorData(true);
    saveMoves();
  }
  function upCurrentBlock() {
    if(getCurrentBlockIndex() != 0){
      let id = getCurrentBlockIndex();
      let item = editorData.current[id-1];
      editorData.current[id-1] = editorData.current[id];
      editorData.current[id] = item;
      setReloadEditorData(true);
      saveMoves();
    }
  }
  function downCurrentBlock() {
    if(editorData.current[getCurrentBlockIndex()+1] != undefined){
      let id = getCurrentBlockIndex();
      let item = editorData.current[id+1];
      editorData.current[id+1] = editorData.current[id];
      editorData.current[id] = item;
      setReloadEditorData(true);
      saveMoves();
    }
  }
  function changeCurrentBlockType(type: string) {
    if (type !== editorData.current[getCurrentBlockIndex()].type) {
      editorData.current[getCurrentBlockIndex()].type = type;
      setReloadEditorData(true);
    }
    saveMoves();
  }
  function changeCurrentBlockData(data: any, update?: boolean) {
    Object.assign(editorData.current[getCurrentBlockIndex()].data, data);
    saveMoves();
  }

  function addBlockAfterCurrentBlock(blockType: string) {
    addBlock({
      insertIndex: getCurrentBlockIndex() + 1,
      blockType: blockType,
    });
  }

  /**
   * --------------------------------------------------------------------
   *
   * functions for the table block
   *
   * --------------------------------------------------------------------
   */
  const currentCellId = useRef<any>(null);
  const currentCellRow = useRef<any>(null);
  const currentCellCol = useRef<any>(null);

  function setCurrentCell(id: string) {
    currentCellId.current = id;
  }
  function setCurrentCellIndex(row: number, col: number) {
    currentCellRow.current = row;
    currentCellCol.current = col;
  }
  function getCurrentCellIndex() {
    return {
      id: currentBlockId.current,
      row: currentCellRow.current,
      column: currentCellCol.current,
    };
  }

  function getCurrentCell() {
    if (currentCellCol.current == null || currentCellRow.current == null) {
      currentCellCol.current = 0;
      currentCellRow.current = 0;
    }
  
    const block = getCurrentBlock();
    if (!block?.data?.table) return null; // block, data, table이 undefined면 null 반환
  
    const rowIndex = Number(currentCellRow.current);
    const colIndex = Number(currentCellCol.current);
  
    return block.data.table[rowIndex]?.[colIndex] ?? null; // 값이 없으면 null 반환
  }
  
  function setCurrentCellColumn(ratio: number) {
    const block = getCurrentBlock();
    block.data.columns.splice(currentCellCol.current, 1, ratio);
  }

  function getCurrentCellColumn() {
    const block = getCurrentBlock();
    if (block.data?.columns) {
      return block.data?.columns[currentCellCol.current];
    } else {
      changeCurrentBlockData({ columns: [1] });
    }
  }

  function getCell(blockIndex: number, row: number, column: number) {
    return editorData.current[blockIndex].data.table[row][column];
  }
  function saveCell(
    blockIndex: number,
    row: number,
    column: number,
    data: any
  ) {
    Object.assign(editorData.current[blockIndex].data.table[row][column], data);
    // console.log(editorData.current[blockIndex]);
    saveMoves();
  }

  function addToCurrentRow() {
    let newRow: any = [];
    for (
      let i = 0;
      i < editorData.current[getCurrentBlockIndex()].data.table[0].length;
      i++
    ) {
      newRow.push({ id: generateId(12), type: "paragraph" });
    }
    if (!isEmpty(newRow)) {
      editorData.current[getCurrentBlockIndex()].data.table.splice(
        currentCellRow.current + 1,
        0,
        newRow
      );
    }
    saveMoves();
  }

  function addToCurrentColumn() {
    const block = getCurrentBlock();
    block.data.columns.splice(currentCellCol.current, 0, 1);
    const table = editorData.current[getCurrentBlockIndex()].data.table;

    for (let i = 0; i < table.length; i++) {
      table[i].splice(currentCellCol.current + 1, 0, {
        id: generateId(12),
        type: "paragraph",
      });
    }
    saveMoves();
  }

  function removeCurrentRow() {
    const table = editorData.current[getCurrentBlockIndex()].data.table;
    if (table.length > 1) {
      table.splice(currentCellRow.current, 1);
    }
    saveMoves();
  }
  function removeCurrentColumn() {
    const block = getCurrentBlock();
    const table = block.data.table;
    if (table[0].length > 1) {
      block.data.columns.splice(currentCellCol.current, 1);

      for (let i = 0; i < table.length; i++) {
        table[i].splice(currentCellCol.current, 1);
      }
    }
    saveMoves();
  }

  function changeCurrentCell(data: any) {
    saveMoves();
    Object.assign(
      editorData.current[getCurrentBlockIndex()].data.table[
        parseInt(currentCellRow.current)
      ][parseInt(currentCellCol.current)],
      data
    );
  }

  /**
   * --------------------------------------------------------------------
   */
  function getBlock(blockIndex: number) {
    return editorData.current[blockIndex];
  }
  function changeBlockData(blockIndex: number, data: any) {
    Object.assign(editorData.current[blockIndex].data, data);
    setReloadEditorData(true);
    saveMoves();
  }

  /**
   * --------------------------------------------------------------------
   * handle key presses
   */

  function saveMoves() {
    if (
      editorDataMovesTrack.current !== 0 &&
      editorDataMovesTrack.current !== editorDataMoves.current.length
    ) {
      editorDataMoves.current = editorDataMoves.current.slice(
        0,
        editorDataMovesTrack.current
      );
    }
    editorDataMoves.current.push(JSON.stringify(editorData.current));
    editorDataMovesTrack.current = editorDataMoves.current.length;

    editorDataMoves.current.length > editorDataMovesLimit &&
      editorDataMoves.current.shift();
  }
  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      editorData.current = JSON.parse(
        editorDataMoves.current[editorDataMovesTrack.current]
      );
      editorDataMovesTrack.current += 1;
      // console.log(editorDataMoves.current);
      setReloadEditorData(true);
    } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      editorData.current = JSON.parse(
        editorDataMoves.current[editorDataMovesTrack.current - 2]
      );
      editorDataMovesTrack.current -= 1;
      // console.log(editorDataMoves.current);

      setReloadEditorData(true);
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  /**
   * --------------------------------------------------------------------
   */

  /**
   * --------------------------------------------------------------------
   *
   * export functions
   *
   * --------------------------------------------------------------------
   */
  const value = {
    editorTitle,
    saveEditorData,
    reloadEditorData,
    editorPageRef,
    setReloadEditorData,
    setPreviewActivated,
    previewActivated,

    addBlock,
    saveBlock,

    handleChangeEditorTitle,
    handleChangeEditorType,

    copyBlockAfterCurrentBlock,
    setCurrentBlock,
    getCurrentBlock,
    removeCurrentBlock,
    upCurrentBlock,
    downCurrentBlock,
    changeCurrentBlockType,
    changeCurrentBlockData,
    addBlockAfterCurrentBlock,

    getBlock,
    changeBlockData,

    setCurrentCell,
    setCurrentCellColumn,
    setCurrentCellIndex,
    getCurrentCellColumn,
    getCurrentCell,
    changeCurrentCell,
    saveCell,
    getCell,
    addToCurrentRow,
    addToCurrentColumn,
    removeCurrentColumn,
    removeCurrentRow,
    getCurrentCellIndex,

    result,
  };

  return (
    <EditorContext.Provider value={value}>
      {!loading ? props.children : <Loading />}
    </EditorContext.Provider>
  );
};
