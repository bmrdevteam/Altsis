import React from "react";
import { useNavigate } from "react-router-dom";
import Svg from "../../assets/svg/Svg";
import style from "../editor.module.scss";
import { useEditor } from "../functions/editorContext";
type Props = {};

const Header = (props: Props) => {
  const navigate = useNavigate();
  const { editorTitle, handleChangeEditorTitle, saveEditorData } = useEditor();

  
  return (
    <div className={style.header_container}>
      <div className={style.header}>
        <div
          className={style.back}
          onClick={() => {
            navigate(-1);
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
        <div className={style.save} onClick={saveEditorData}>
          저장
        </div>
      </div>
    </div>
  );
};

export default Header;
