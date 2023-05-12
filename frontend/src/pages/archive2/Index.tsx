import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import style from "style/pages/archive.module.scss";

import { useAuth } from "contexts/authContext";
import Navbar from "layout/navbar/Navbar";

type Props = {};

const Archive = (props: Props) => {
  const navigate = useNavigate();
  const { currentSchool } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isLoading) {
      if (currentSchool?._id && currentSchool?.formArchive?.length !== 0) {
        navigate(currentSchool.formArchive[0].label);
      } else {
        setIsLoading(false);
      }
    }
  }, [isLoading]);

  return (
    <>
      {!isLoading && currentSchool?.formArchive?.length === 0 && (
        <>
          <Navbar />
          <div className={style.section}>
            <div style={{ display: "flex", gap: "24px" }}>
              <div style={{ flex: "1 1 0" }}>
                <div className={style.title}>기록</div>
                <div className={style.description}>
                  {`등록된 양식이 없습니다.`}
                  <br />
                  <a
                    href={"/admin/schools/" + currentSchool._id + "#기록"}
                    title={"/admin/schools/" + currentSchool._id + "#기록"}
                    style={{ textDecoration: "underline" }}
                  >
                    {"관리자 > 학교 > 기록"}
                  </a>
                  {`에서 양식을 등록해주세요.`}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Archive;
