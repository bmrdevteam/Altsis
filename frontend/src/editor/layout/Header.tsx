import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Svg from "../../assets/svg/Svg";
import style from "../editor.module.scss";
import { useEditor } from "../functions/editorContext";
import useEditorStore from "../functions/useEditorStore";


const Header = () => {
  const navigate = useNavigate();
  const { editorTitle, handleChangeEditorTitle, saveEditorData } = useEditor();
  const { preview, updatePreviewState } = useEditorStore();
  return (
    <div className={style.header_container}>
      <div className={style.header}>
        <div
          className={style.back}
          onClick={() => {
            navigate(`/admin/forms`);
          }}
        >
          <Svg type={"arrowBack"} width="20px" height="20px" />
        </div>
        <div className={style.title}>
          <input
            defaultValue={editorTitle}
            onChange={handleChangeEditorTitle}
            onBlur={saveEditorData}
          />
        </div>

        <div className={style.preview} onClick={updatePreviewState}>
          {preview ? "편집" : "미리보기"}
        </div>
        <div className={style.save} onClick={saveEditorData}>
          저장
        </div>
      </div>
    </div>
  );
};

export default Header;
