import { useEffect } from "react";

import style from "./editor.module.scss";
import useEditorStore from "./store/useEditorStore";
import useAPIv2 from "hooks/useAPIv2";
import Loading from "../components/loading/Loading";
import Content from "./layout/Content";
import Header from "./layout/Header";
import Sidebar from "./layout/sidebar/Sidebar";
import InlineToolbar from "./layout/InlineToolbar";
import EditorToast from "./layout/EditorToast";

type Props = { id: string };

function Editor(props: Props) {
  const { FormAPI } = useAPIv2();
  const mode = useEditorStore((s) => s.mode);
  const sidebarOpen = useEditorStore((s) => s.sidebarOpen);
  const isLoading = useEditorStore((s) => s.isLoading);
  const loadForm = useEditorStore((s) => s.loadForm);

  useEffect(() => {
    loadForm(props.id, FormAPI);
  }, [props.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = useEditorStore.getState();

      if (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        store.redo();
      } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        store.undo();
      } else if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        store.saveForm(FormAPI);
      } else if (e.key === "\\" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        store.toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [FormAPI]);

  if (isLoading) {
    return (
      <div className={style.editor}>
        <Loading />
      </div>
    );
  }

  return (
    <div className={style.editor}>
      <Header />
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <Content />
        {mode === "edit" && sidebarOpen && <Sidebar />}
      </div>
      {mode === "edit" && <InlineToolbar />}
      <EditorToast />
    </div>
  );
}

export default Editor;
