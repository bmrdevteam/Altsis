import { useAuth } from "contexts/authContext";
import EditorParser from "editor/EditorParser";
import useDatabase from "hooks/useDatabase";
import Navbar from "layout/navbar/Navbar";
import React, { useEffect, useState } from "react";
import style from "style/pages/archive.module.scss";
type Props = {};

const Archive = (props: Props) => {
  const database = useDatabase();
  const { currentSchool } = useAuth();
  const [formData, setFormData] = useState<any>();
  const [DBData, setDBData] = useState<any>();
  async function getPrintForms() {
    const { forms: result } = await database.R({ location: "forms" });
    return result;
  }

  async function getDBData() {
    const archive = await database.R({
      location: `archives?school=${currentSchool.school}&userId=${191025}`,
    });
    // const evaluation = await database.R({
    //   location: `enrollments/evaluations?userId=${191025}`,
    // });
    return { [currentSchool.schoolId]: { archive: archive.data } };
    
  }

  async function getFormData(id: string) {
    // const { forms: result } = await database.R({ location: `forms/${id}` });
    const result = await database.R({
      location: `forms/637f8ec0a7b07cb7f3a27da5`,
    });
    return result;
  }
  useEffect(() => {
    getPrintForms().then((res) => {
      console.log(res);
    });
    getFormData("").then((res) => {
      setFormData(res);
    });
    getDBData().then((res) => {
      setDBData(res);
    });
  }, []);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <EditorParser auth="edit" data={formData} dbData={DBData} />
      </div>
    </>
  );
};

export default Archive;
