import { useState } from "react";
import { useAppNavigate } from "hooks/useAppNavigate";
import Svg from "../../assets/svg/Svg";
import style from "../editor.module.scss";
import useEditorStore from "../store/useEditorStore";
import useAPIv2 from "hooks/useAPIv2";
import FormSettingsPopup from "./FormSettingsPopup";

const Header = () => {
  const navigate = useAppNavigate();
  const { FormAPI } = useAPIv2();
  const title = useEditorStore((s) => s.title);
  const mode = useEditorStore((s) => s.mode);
  const isSaving = useEditorStore((s) => s.isSaving);
  const isDirty = useEditorStore((s) => s.isDirty);
  const sidebarOpen = useEditorStore((s) => s.sidebarOpen);
  const toggleMode = useEditorStore((s) => s.toggleMode);
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar);
  const saveForm = useEditorStore((s) => s.saveForm);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const historyLen = useEditorStore((s) => s.history.length);
  const futureLen = useEditorStore((s) => s.future.length);
  const [settingsPopupActive, setSettingsPopupActive] = useState(false);

  const handleBack = () => {
    navigate(`/admin/forms`);
  };

  return (
    <div className={style.header_container}>
      <div className={style.header}>
        <div className={style.back} onClick={handleBack}>
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
            }}
          >
            <Svg type="refresh" width="18px" height="18px" style={{ transform: "scaleX(-1)" }} />
          </div>
          <div
            onClick={() => futureLen > 0 && redo()}
            title="다시실행 (Ctrl+Shift+Z)"
            style={{
              cursor: futureLen === 0 ? "default" : "pointer",
              opacity: futureLen === 0 ? 0.3 : 1,
              padding: "4px 8px",
            }}
          >
            <Svg type="refresh" width="18px" height="18px" />
          </div>

          <div
            className={style.preview}
            onClick={toggleMode}
            title={mode === "preview" ? "편집" : "미리보기"}
            style={{ cursor: "pointer", padding: "4px 8px" }}
          >
            <Svg type={mode === "preview" ? "edit" : "search"} width="18px" height="18px" />
          </div>
          <div
            className={`${style.save} ${isDirty ? style.save_dirty : ""}`}
            onClick={() => !isSaving && saveForm(FormAPI)}
            title={
              isSaving
                ? "저장 중..."
                : isDirty
                  ? "저장되지 않은 변경사항이 있습니다 (Ctrl+S)"
                  : "저장 (Ctrl+S)"
            }
            style={{
              cursor: isSaving ? "default" : "pointer",
              padding: "4px 8px",
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            <Svg
              type="save"
              width="18px"
              height="18px"
              style={isDirty ? { fill: "#e74c3c" } : undefined}
            />
          </div>
          <div
            onClick={() => setSettingsPopupActive(true)}
            title="설정"
            style={{ cursor: "pointer", padding: "4px 8px" }}
          >
            <Svg type="settings" width="18px" height="18px" />
          </div>

          {mode === "edit" && (
            <div
              onClick={toggleSidebar}
              title="사이드바 토글 (Ctrl+\)"
              style={{
                cursor: "pointer",
                padding: "4px 8px",
                opacity: sidebarOpen ? 1 : 0.5,
              }}
            >
              <Svg type="menu" width="18px" height="18px" />
            </div>
          )}
        </div>
      </div>
      {settingsPopupActive && (
        <FormSettingsPopup setState={setSettingsPopupActive} />
      )}
    </div>
  );
};

export default Header;
