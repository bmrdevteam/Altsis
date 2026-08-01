import { useAuth } from "contexts/authContext";
import { useParams } from "react-router-dom";
import { useAppNavigate } from "hooks/useAppNavigate";
import style from "style/pages/archive.module.scss";
import { useEffect, useRef, useState } from "react";

import ArrayView from "./tab/ArrayView";
import ObjectView from "./tab/ObjectView";
import Loading from "components/loading/Loading";

type Props = {};

const ArchiveField = (props: Props) => {
  const { pid } = useParams(); // archive label ex) 인적 사항
  const { currentSchool, currentRegistration, currentUser } = useAuth();
  const navigate = useAppNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (currentRegistration && pid) {
      setIsLoading(true);
    }
  }, [currentRegistration, pid]);

  useEffect(() => {
    if (isLoading) {
      // 본인 기록(/myArchive)은 authStudent 권한만 보면 된다.
      // 교사·매니저도 본인 기록을 채울 수 있으므로 role===student 제한을 두지 않는다.
      const auth = formArchive().authStudent;
      if (
        !currentRegistration ||
        !auth ||
        auth === "undefined"
      ) {
        alert("접근 권한이 없습니다.");
        navigate("/");
        return;
      }
      if (auth === "view" || auth === "viewAndEdit") {
        setIsLoading(false);
      }
    }
  }, [isLoading]);

  function formArchive() {
    let label = pid || "";
    try {
      label = decodeURIComponent(label);
    } catch {
      /* keep raw */
    }
    return (
      currentSchool.formArchive?.filter((val: any) => {
        return val.label === label;
      })[0] ?? { authStudent: "undefined", fields: [] }
    );
  }

  const archive = formArchive();
  let title = pid || "";
  try {
    title = decodeURIComponent(title);
  } catch {
    /* keep raw */
  }

  return !isLoading ? (
    <>
      <div className={style.section}>
        <div className={style.title}>{title}</div>

        {archive.dataType === "object" ? (
          <ObjectView editable={archive.authStudent === "viewAndEdit"} />
        ) : (
          <ArrayView editable={archive.authStudent === "viewAndEdit"} />
        )}
      </div>
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default ArchiveField;
