import { useNavigate } from "react-router-dom";
import Svg from "../../assets/svg/Svg";
import style from "../editor.module.scss";
import useEditorStore from "../store/useEditorStore";
import useAPIv2 from "hooks/useAPIv2";

const Header = () => {
  const navigate = useNavigate();
  const { FormAPI } = useAPIv2();
  const title = useEditorStore((s) => s.title);
  const mode = useEditorStore((s) => s.mode);
  const isSaving = useEditorStore((s) => s.isSaving);
  const sidebarOpen = useEditorStore((s) => s.sidebarOpen);
  const toggleMode = useEditorStore((s) => s.toggleMode);
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar);
  const saveForm = useEditorStore((s) => s.saveForm);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const historyLen = useEditorStore((s) => s.history.length);
  const futureLen = useEditorStore((s) => s.future.length);

  return (
    <div className={style.header_container}>
      <div className={style.header}>
        <div
          className={style.back}
          onClick={() => {
            navigate(`/admin/forms`);
          }}
        >
          <Svg type={"arrowLeft"} width="20px" height="20px" />
        </div>
        <div className={style.title}>
          <span>{title || "제목 없음"}</span>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div
            onClick={() => historyLen > 1 && undo()}
            title="실행취소 (Ctrl+Z)"
            style={{
              cursor: historyLen <= 1 ? "default" : "pointer",
              opacity: historyLen <= 1 ? 0.3 : 1,
              padding: "4px 8px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            ↩
          </div>
          <div
            onClick={() => futureLen > 0 && redo()}
            title="다시실행 (Ctrl+Shift+Z)"
            style={{
              cursor: futureLen === 0 ? "default" : "pointer",
              opacity: futureLen === 0 ? 0.3 : 1,
              padding: "4px 8px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            ↪
          </div>

          <div className={style.preview} onClick={toggleMode}>
            {mode === "preview" ? "편집" : "미리보기"}
          </div>
          <div
            className={style.save}
            onClick={() => saveForm(FormAPI)}
          >
            {isSaving ? "저장 중..." : "저장"}
          </div>

          {mode === "edit" && (
            <div
              onClick={toggleSidebar}
              title="사이드바 토글 (Ctrl+\)"
              style={{
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: "14px",
                fontWeight: sidebarOpen ? 600 : 400,
              }}
            >
              ☰
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
