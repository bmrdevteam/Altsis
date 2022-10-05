import _, { isArray } from "lodash";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import Loading from "../../components/loading/Loading";
import useDatabase from "../../hooks/useDatabase";
import useGenerateId from "../../hooks/useGenerateId";

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
  getCurrentBlock: () => any;
  changeCurrentBlockType: (type: string) => void;
  changetCurrentBlockData: (data: any) => void;
  addBlockAfterCurrentBlock: (blockType: string) => void;
  changeBlockData: (blockIndex: number, data: any) => void;
  result: () => Array<any>;
  getBlock: (blockIndex: number) => any;
  setCurrentCell: (id: string) => void;
  setCurrentCellIndex: (row: number, col: number) => void;
  getCurrentCell: () => any;
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
  const database = useDatabase();
  const generateId = useGenerateId;

  const [loading, setLoading] = useState<boolean>(true);

  const [editorTitle, setEditorTitle] = useState<string>();
  const [editorType, setEditorType] = useState<string>();

  /**
   * editor data
   */
  const editorData = useRef<any>(null);

  /**
   * editor page ref
   */
  const editorPageRef = useRef<HTMLDivElement>(null);

  /**
   * get the form data from the backend
   * @async
   */
  async function getEditorData() {
    const { form: result } = await database.R({
      location: `forms/${props.id}`,
    });
    return result;
  }
  /**
   * save the form data to the backend
   */
  async function saveEditorData() {
    await database.U({
      location: `forms/${props.id}`,
      data: {
        new: {
          title: editorTitle,
          type: editorType,
          data: result(),
        },
      },
    });
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
      data: blockData ? blockData : { text: "" },
    };
    if (blockType === "table") {
      block = {
        id: `${props.id}-${blockId}`,
        type: "table",
        data: {
          table: {
            0: [
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
            1: [
              {
                id: `${blockId}-${generateId(12)}`,
                data: { text: "" },
                type: "checkbox",
              },
              {
                id: `${blockId}-${generateId(12)}`,
                data: { text: "" },
                type: "input",
              },
              {
                id: `${blockId}-${generateId(12)}`,
                data: { text: "" },
                type: "select",
              },
            ],
          },
        },
      };
    }
    console.log("inserting after", insertIndex);

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
      console.log("updated", editorData.current);
    }
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

  function getCurrentBlockIndex() {
    return _.findIndex(editorData.current, { id: currentBlockId.current });
  }

  function getCurrentBlock() {
    return editorData.current[getCurrentBlockIndex()];
  }
  function changeCurrentBlockType(type: string) {
    if (type !== editorData.current[getCurrentBlockIndex()].type) {
      editorData.current[getCurrentBlockIndex()].type = type;
      setReloadEditorData(true);
    }
  }
  function changetCurrentBlockData(data: any, update?: boolean) {
    Object.assign(editorData.current[getCurrentBlockIndex()].data, data);
  }

  function addBlockAfterCurrentBlock(blockType: string) {
    addBlock({
      insertIndex: getCurrentBlockIndex() + 1,
      blockData: { text: "" },
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
    console.log("row", row, "col", col);

    currentCellRow.current = row;
    currentCellCol.current = col;
  }

  function getCurrentCell() {
    if (!(currentCellRow.current && currentCellCol.current)) {
      currentCellRow.current = 0;
      currentCellCol.current = 0;
    }
    console.log(
      getCurrentBlock().data?.table[currentCellRow.current][
        parseInt(currentCellCol.current)
      ]
    );

    return;
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
  }

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

    addBlock,
    saveBlock,

    handleChangeEditorTitle,
    handleChangeEditorType,

    setCurrentBlock,
    getCurrentBlock,
    changeCurrentBlockType,
    changetCurrentBlockData,
    addBlockAfterCurrentBlock,

    getBlock,
    changeBlockData,

    setCurrentCell,
    setCurrentCellIndex,
    getCurrentCell,

    result,
  };

  return (
    <EditorContext.Provider value={value}>
      {!loading ? props.children : <Loading />}
    </EditorContext.Provider>
  );
};
