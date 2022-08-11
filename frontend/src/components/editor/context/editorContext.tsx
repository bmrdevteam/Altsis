import React, { createContext, useContext, useState } from "react";
import useEditor from "../hooks/useEditor";

const EditorContext = createContext<any>(null);

export function useEditorData() {
  return useContext(EditorContext);
}

export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [editorData, SetEditorData] = useState<any>();
  const [auth, SetAuth] = useState<"read" | "edit">();
  const editor = useEditor(SetEditorData);

  const value = { editorData, SetEditorData, auth, SetAuth, editor };
  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};
