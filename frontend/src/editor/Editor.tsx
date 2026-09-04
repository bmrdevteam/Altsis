import { useEffect } from "react";
import { useAuth } from "contexts/authContext";
import useRegisterAlterForm from "hooks/useRegisterAlterForm";

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
  const { currentUser } = useAuth();
  const mode = useEditorStore((s) => s.mode);
  const sidebarOpen = useEditorStore((s) => s.sidebarOpen);
  const isLoading = useEditorStore((s) => s.isLoading);
  const loadForm = useEditorStore((s) => s.loadForm);
  const formType = useEditorStore((s) => s.formType);
  const title = useEditorStore((s) => s.title);
  const canManage =
    currentUser?.auth === "admin" || currentUser?.auth === "manager";

  useRegisterAlterForm({
    enabled: !isLoading && canManage,
    formId: props.id,
    formType,
    label: title || "양식 문서",
    getForm: () => {
      const s = useEditorStore.getState();
      return {
        formId: s.formId || props.id,
        title: s.title,
        formType: s.formType,
        blocks: s.blocks,
      };
    },
    applyFormDraft: (next) =>
      useEditorStore.getState().applyFormDraft(next),
  });

  useEffect(() => {
    loadForm(props.id, FormAPI);
  }, [props.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = useEditorStore.getState();

      if (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        if (store.future.length === 0) return;
        e.preventDefault();
        store.redo();
      } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        // 입력 중에는 blur 전이라 스냅샷이 없을 수 있다. 먼저 찍고 되돌린다.
        store.saveSnapshot();
        if (store.history.length <= 1) return;
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
