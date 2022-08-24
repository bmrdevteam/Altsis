import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Editor from "../../../components/editor/Editor";
import useEditor from "../../../hooks/useEditor";
import Input from "../../../components/input/Input";
import useDatabase from "../../../hooks/useDatabase";
import style from "../../../style/pages/admin/forms/forms.module.scss";
import Divider from "../../../components/divider/Divider";

type Props = {};

const Form = (props: Props) => {
  const { pid } = useParams<"pid">();
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
    }

    return () => {};
  }, [updateFormData]);

  return (
    <div>
      <div className={style.header_container}>
        <div
          className={style.title}
          onClick={() => {
            editor.addBlock({
              blockType: "timetable",
            });
          }}
        >
          {formData?.title}
        </div>
        <div className={style.menus}>
          <div className={style.menu}>파일</div>
          <div className={style.menu}>편집</div>
          <div className={style.menu}>속성</div>
        </div>
        <Divider></Divider>
        <div></div>
      </div>
      <div style={{padding:"24px 0"}}>
        <Editor auth="edit" editorhook={editor} initalData={formData?.data} />
      </div>
    </div>
  );
};

export default Form;
