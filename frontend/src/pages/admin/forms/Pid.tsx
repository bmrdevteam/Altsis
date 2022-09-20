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
  /**
   * get the page id
   */
  const { pid } = useParams<"pid">();
  /**
   * navigation hook
   */
  const navigate = useNavigate();
  /**
   * database hook
   */
  const database = useDatabase();
  /**
   * counter for tracking updates
   */
  let updateCounter = 0;
  const editor = useEditor(() => {
    if (updateCounter >= 5) {
      // reset the counter
      updateCounter = 0;
      /**
       * count to 5 updates before saving to the backend
       */
      saveFormData();
    } else {
      //increase the counter
      updateCounter += 1;
    }
  });

  /**
   * form title for the current form
   */
  const [formTitle, setFormTitle] = useState<string>();
  /**
   * form type for the current form
   */
  const [formType, setFormType] = useState<string>();
  /**
   * stat for the form data from the backend
   */

  const [updateFormData, setUpdateFormData] = useState<boolean>(true);
  /**
   * get the form data from the backend
   * @async
   */
  async function getFormData() {
    const { form: result } = await database.R({ location: `forms/${pid}` });
    return result;
  }
  /**
   * save the form data to the backend
   */
  async function saveFormData() {
    await database.U({
      location: `forms/${pid}`,
      data: {
        new: {
          type: formType,
          title: formTitle,
          data: editor.result(),
        },
      },
    });
  }

  useEffect(() => {
    /**
     * if the updateFormData is TRUE
     */
    updateFormData &&
      getFormData().then((res) => {
        /**
         * set the updateFormData to FALSE
         */
        setUpdateFormData(false);
        /**
         * set the form title
         */
        setFormTitle(res.title);
        /**
         * set the form type
         */
        setFormType(res.type);
        /**
         * pass in the initial data to the editor hook
         */
        editor.initalData(res.data);

        /**
         * set the document title to the current form title
         */
        document.title = res?.title;
      });

    return () => {};
  }, [updateFormData]);

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
      {!updateFormData ? (
        <Editor
          auth="edit"
          editorhook={editor}
          editorId={pid ?? "idUndefined"}
        />
      ) : (
        <>로딩중</>
      )}
    </div>
  );
};

export default Form;
