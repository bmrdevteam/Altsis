import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Editor from "../../../components/editor/Editor";
import useEditor from "../../../hooks/useEditor";

import useDatabase from "../../../hooks/useDatabase";
import style from "../../../style/pages/admin/forms/forms.module.scss";
import Divider from "../../../components/divider/Divider";
import ReloadWarning from "../../../components/reloadwarning/ReloadWarning";

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
    } else {
      editor.initalData(formData);
    }

    return () => {};
  }, [updateFormData]);

  return (
    <div>
      <Editor auth="edit" editorhook={editor} initalData={formData?.data} />
    </div>
  );
};

export default Form;
