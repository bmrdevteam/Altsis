/**
 * @file Schools Pid Page
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 * @version 1.0
 *
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useApi from "hooks/useApi";
import style from "style/pages/admin/schools.module.scss";

// components
import Tab from "components/tab/Tab";
import Skeleton from "components/skeleton/Skeleton";

// tab elements
import Season from "./tab/seasons/Season";
import Archive from "./tab/archive/Index";
import User from "./tab/users/User";
import Links from "./tab/Links";
import Calendars from "./tab/Calendars";
import Remove from "./tab/Remove";

import { useAuth } from "contexts/authContext";
import Navbar from "layout/navbar/Navbar";
import useAPIv2 from "hooks/useAPIv2";
import { TSchool } from "types/schools";
import Loading from "components/loading/Loading";
import { TSeason } from "types/auth";

type Props = {};

const CannotFindSchool = ({ schoolId }: { schoolId?: string }) => {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
      }}
    >
      <div style={{ textAlign: "center" }}>
        학교<strong>{schoolId}</strong>
        를 찾을 수 없습니다 <br />
        <span
          style={{ cursor: "pointer" }}
          onClick={() => {
            navigate("/academy/schools/add", { replace: true });
          }}
        >
          학교 추가하기
        </span>
      </div>
    </div>
  );
};

const School = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { SeasonApi } = useApi();
  const { SchoolAPI } = useAPIv2();
  const { currentUser, currentSchool } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [schoolData, setSchoolData] = useState<TSchool>();
  const [seasonList, setSeasonList] = useState<TSeason[]>([]);
  const [isSchool, setIsSchool] = useState<boolean>(true);

  useEffect(() => {
    if (isLoading && pid) {
      if (currentUser.auth === "manager" && currentSchool._id !== pid) {
        return navigate("/admin/schools/" + currentSchool._id);
      }
      SchoolAPI.RSchool({ params: { _id: pid } })
        .then(({ school }) => {
          setSchoolData(school);
          SeasonApi.RSeasons({ school: school._id }).then((seasons) => {
            setSeasonList(seasons);
            setIsLoading(false);
          });
        })
        .catch((err: any) => {
          setIsSchool(false);
        });
    }
  }, [isLoading, pid, currentSchool]);

  if (!isSchool) {
    return <CannotFindSchool />;
  }

  return !isLoading ? (
    <>
      <Navbar />
      <div className={style.section}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 500,
            marginBottom: "18px",
            display: "flex",
            color: "var(--accent-1)",
          }}
        >
          <div style={{ wordBreak: "keep-all" }} title="목록으로 이동">
            <span>&nbsp;/&nbsp;</span>
            <span
              style={{ cursor: "pointer" }}
              onClick={() => {
                if (currentUser?.auth === "admin") {
                  navigate("/admin/schools/list", { replace: true });
                }
              }}
            >
              {`학교 관리 / ${pid}`}
            </span>
          </div>
        </div>

        <div className={style.title}>
          {schoolData !== undefined ? (
            `${schoolData.schoolName} (${schoolData.schoolId})`
          ) : (
            <Skeleton height="22px" width="20%" />
          )}
        </div>
        {schoolData && (
          <Tab
            items={
              currentUser?.auth === "admin"
                ? {
                    학기: (
                      <Season
                        school={schoolData._id}
                        seasonList={seasonList}
                        setSeasonList={setSeasonList}
                      />
                    ),
                    기록: <Archive school={schoolData._id} />,
                    사용자: <User schoolData={schoolData} />,
                    "사이드바 링크": (
                      <Links
                        schoolData={schoolData}
                        setSchoolData={setSchoolData}
                      />
                    ),
                    일정: (
                      <Calendars
                        schoolData={schoolData}
                        setSchoolData={setSchoolData}
                      />
                    ),
                    삭제: <Remove schoolData={schoolData} />,
                  }
                : {
                    학기: (
                      <Season
                        school={schoolData._id}
                        seasonList={seasonList}
                        setSeasonList={setSeasonList}
                      />
                    ),
                    기록: <Archive school={schoolData._id} />,
                    사용자: <User schoolData={schoolData} />,
                    "사이드바 링크": (
                      <Links
                        schoolData={schoolData}
                        setSchoolData={setSchoolData}
                      />
                    ),
                    일정: (
                      <Calendars
                        schoolData={schoolData}
                        setSchoolData={setSchoolData}
                      />
                    ),
                  }
            }
          />
        )}
      </div>
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default School;
