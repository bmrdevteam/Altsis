import React from "react";
import useDatabase from "../../../hooks/useDatabase";

const useEditor = (setEditorData: React.Dispatch<any>) => {

  const database = useDatabase()
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
  function create() {

    

  }

  function addBlock(insertAfter?: number) {
    setEditorData((prev: any) => {
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
  }

  function deleteBlock(blockId: string) {
    setEditorData((prev: any) => {
      return prev.filter((value: any) => {
        return value.id !== blockId;
      });
    });
  }
  function save() {}
  function autoSave() {}

  return { addBlock, deleteBlock, save, create };
};

export default useEditor;
