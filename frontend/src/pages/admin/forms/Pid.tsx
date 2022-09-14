import React, { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import Editor from "../../../components/editor/Editor";
import useEditor from "../../../hooks/useEditor";

import useDatabase from "../../../hooks/useDatabase";
import style from "../../../style/pages/admin/forms/forms.module.scss";
import Divider from "../../../components/divider/Divider";
import ReloadWarning from "../../../components/reloadwarning/ReloadWarning";
import Svg from "../../../assets/svg/Svg";

type Props = {};

const Form = (props: Props) => {
  const { pid } = useParams<"pid">();
  const navigate = useNavigate();
  const database = useDatabase();
  const editor = useEditor();

  const [formData, setformData] = useState<any>();
  const [updateFormData, setUpdateFormData] = useState<boolean>(true);
  /**
   * get the form data from the backend
   * @async
   */
  async function getFormdata() {
    await database.R({ location: `forms/${pid}` }).then((res) => {
      setformData(res.form);
    });
  }
  useEffect(() => {
    updateFormData &&
      getFormdata().then(() => {
        setUpdateFormData(false);
      });
    //first time
    if (formData !== undefined && formData?.data === undefined) {
      editor.initalData(formData);
    } else {
      editor.initalData(formData);
    }

    return () => {};
  }, [updateFormData]);

  return (
    <div
      style={{
        position: "fixed",
        width: "100vw",
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
            <input defaultValue={formData?.title} />
          </div>
          <div className={style.save}>저장</div>
        </div>
      </div>

      <Editor auth="edit" editorhook={editor} initalData={formData?.data} />
    </div>
  );
};

export default Form;
