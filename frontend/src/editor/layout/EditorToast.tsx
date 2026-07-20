import { useEffect } from "react";
import useEditorStore from "../store/useEditorStore";
import style from "../editor.module.scss";

const EditorToast = () => {
  const toast = useEditorStore((s) => s.toast);
  const clearToast = useEditorStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => clearToast(), 2500);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div
      className={`${style.editor_toast} ${
        toast.type === "error" ? style.editor_toast_error : style.editor_toast_success
      }`}
      role="status"
    >
      {toast.message}
    </div>
  );
};

export default EditorToast;
