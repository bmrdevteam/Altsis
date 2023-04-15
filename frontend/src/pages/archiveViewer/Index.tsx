import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import style from "style/pages/archive.module.scss";

import { useAuth } from "contexts/authContext";
import Navbar from "layout/navbar/Navbar";
import useApi from "hooks/useApi";

type Props = {};

const Archive = (props: Props) => {
  const navigate = useNavigate();
  const { currentSchool, setCurrentSchool } = useAuth();
  const { SchoolApi } = useApi();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isLoading) {
      if (currentSchool?._id) {
        SchoolApi.RSchool(currentSchool?._id)
          .then((s) => {
            const archives = s.formArchive?.filter(
              (val: any) => val.authOptionStudentView
            );

            if (archives?.length !== 0) {
              setCurrentSchool((prev: any) => ({ ...prev, ...s }));
              navigate(archives[0].label);
            }
          })
          .then(() => {
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    }
  }, [isLoading]);

  return (
    <>
      {!isLoading &&
        currentSchool?.formArchive?.filter(
          (val: any) => val.authOptionStudentView
        ).length === 0 && (
          <>
            <Navbar />
            <div className={style.section}>
              <div style={{ display: "flex", gap: "24px" }}>
                <div style={{ flex: "1 1 0" }}>
                  <div className={style.title}>내 정보</div>
                  <div className={style.description}>
                    {`조회 가능한 정보가 없습니다.`}
                    <br />
                    {`학교 관리자에게 문의해주세요.`}
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
