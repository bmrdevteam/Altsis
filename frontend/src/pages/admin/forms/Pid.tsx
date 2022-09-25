import React, { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import Editor from "../../../components/editor/Editor";
import useEditor from "../../../components/editor/context/useEditor";

import useDatabase from "../../../hooks/useDatabase";
import style from "../../../style/pages/admin/forms/forms.module.scss";
import Divider from "../../../components/divider/Divider";
import ReloadWarning from "../../../components/reloadwarning/ReloadWarning";
import Svg from "../../../assets/svg/Svg";
import { useEditorFunctions } from "../../../components/editor/context/editorContext";

type Props = {};

const Form = (props: Props) => {
  /**
   * get the page id
   */
  const { pid } = useParams<"pid">();
  /**
   * navigation hook
   */
  const navigate = useNavigate();

  /**
   * counter for tracking updates
   */
  const { editor, formTitle, setFormTitle, saveFormData } =
    useEditorFunctions();

  return (
    <div
      style={{
        position: "fixed",
        width: "100vw",
        height: "100vh",
        top: "0",
        left: "0",
        zIndex: "3000",
        background: "var(--background-color)",
      }}
    >
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
              defaultValue={formTitle}
              onChange={(e) => {
                setFormTitle(e.target.value);
              }}
            />
          </div>
          <div className={style.save} onClick={saveFormData}>
            저장
          </div>
        </div>
      </div>

      <Editor auth="edit" editorId={pid ?? "idUndefined"} />
    </div>
  );
};

export default Form;
