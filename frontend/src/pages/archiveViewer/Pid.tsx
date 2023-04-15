import { useAuth } from "contexts/authContext";
import Navbar from "layout/navbar/Navbar";
import { useParams } from "react-router-dom";
import style from "style/pages/archive.module.scss";

import ArrayView from "./tab/ArrayView";
import ObjectView from "./tab/ObjectView";

type Props = {};

const ArchiveField = (props: Props) => {
  const { pid } = useParams(); // archive label ex) 인적 사항
  const { currentSchool } = useAuth();

  function formArchive() {
    return (
      currentSchool.formArchive?.filter((val: any) => {
        return val.label === pid;
      })[0] ?? { fields: [] }
    );
  }

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>{pid}</div>

        {formArchive().dataType === "object" ? <ObjectView /> : <ArrayView />}
      </div>
    </>
  );
};

export default ArchiveField;
