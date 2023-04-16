import { useAuth } from "contexts/authContext";
import Navbar from "layout/navbar/Navbar";
import { useNavigate, useParams } from "react-router-dom";
import style from "style/pages/archive.module.scss";
import { useEffect, useRef, useState } from "react";

import ArrayView from "./tab/ArrayView";
import ObjectView from "./tab/ObjectView";
import Loading from "components/loading/Loading";

type Props = {};

const ArchiveField = (props: Props) => {
  const { pid } = useParams(); // archive label ex) 인적 사항
  const { currentSchool, currentRegistration, currentUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (currentRegistration && pid) {
      setIsLoading(true);
    }
  }, [currentRegistration, pid]);

  useEffect(() => {
    if (isLoading) {
      if (
        !currentRegistration ||
        currentRegistration?.role !== "student" ||
        !formArchive().authStudent ||
        formArchive().authStudent === "undefined"
      ) {
        alert("접근 권한이 없습니다.");
        navigate("/");
      }
      if (formArchive().authStudent === "view") {
        setIsLoading(false);
      }
    }
  }, [isLoading]);

  function formArchive() {
    return (
      currentSchool.formArchive?.filter((val: any) => {
        return val.label === pid;
      })[0] ?? { authStudent: "undefined", fields: [] }
    );
  }

  return !isLoading ? (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>{pid}</div>

        {formArchive().dataType === "object" ? <ObjectView /> : <ArrayView />}
      </div>
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default ArchiveField;
