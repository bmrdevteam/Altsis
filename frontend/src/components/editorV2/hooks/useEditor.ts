import { RefObject, useEffect, useState } from "react";
import { IBlock } from "../types/dataTypes";

function useEditor(data: object) {
  const [editorData, setEditorData] = useState<IBlock[]>(data as IBlock[]);

  useEffect(() => {
    return () => {};
  }, []);

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

  function addBlock(insertAfter?: number) {
    setEditorData((prev) => {
      if (insertAfter !== undefined) {
        if (insertAfter > 0) {
          return [
            // the front half of the array
            ...prev.slice(0, insertAfter),
            // inserting the block
            {
              id: generateId(12),
              type: "paragraph",
              data: { text: "" },
            },
            // the back half of the array
            ...prev.slice(insertAfter, prev.length),
          ];
        }
      }

      return [
        {
          id: generateId(12),
          type: "paragraph",
          data: { text: "success" },
        },
        ...prev,
      ];
    });
    console.log(editorData);
  }

  function deleteBlock(blockId: string) {
    setEditorData((prev) => {
      return prev.filter((value) => {
        return value.id !== blockId;
      });
    });
  }

  return { editorData , addBlock, deleteBlock };
}

function useAutoSave() {
  return;
}
function useSave(data: object) {
  // useDataBaseCreate
  // useDataBaseUpdate

  return;
}
function useExport() {}

function useSelectionPosition(editorContainerRef: RefObject<HTMLDivElement>) {
  const [selectionX, setSelectionX] = useState<number>();
  const [selectionY, setSelectionY] = useState<number>();
  const [isSelecting, setIsSelecting] = useState<boolean>(false);

  document.onselectionchange = () => {
    if (document.getSelection()?.toString() !== "") {
      setIsSelecting(true);

      let i = document.getSelection()?.getRangeAt(0).getBoundingClientRect();
      setSelectionX(
        i
          ? i.left -
              (editorContainerRef.current
                ? (editorContainerRef.current.offsetWidth -
                    (document.getElementById("editor") !== null
                      ? document.getElementById("editor")!.offsetWidth
                      : 0)) /
                  2
                : 0)
          : 0
      );
      setSelectionY(
        i
          ? i.top +
              (editorContainerRef.current
                ? editorContainerRef.current.scrollTop
                : 0)
          : 0
      );
    }

    return setIsSelecting(
      window.getSelection()?.toString() !== "" ? true : false
    );
  };

  return { isSelecting, selectionX, selectionY };
}

export { useSave, useAutoSave, useSelectionPosition };
export default useEditor;
