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

// tab elements
import Season from "./tab/seasons/Season";
import Skeleton from "../../../components/skeleton/Skeleton";
import Archive from "./tab/Archive";
import User from "./tab/users/User";
import Links from "./tab/Links";
import Calendars from "./tab/Calendars";

import { useAuth } from "contexts/authContext";
import Navbar from "layout/navbar/Navbar";

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
  const { currentSchool } = useAuth();
  const { SchoolApi, SeasonApi } = useApi();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [schoolData, setSchoolData] = useState<any>();
  const [seasonList, setSeasonList] = useState<any>();
  const [isSchool, setIsSchool] = useState<boolean>(true);

  useEffect(() => {
    if (isLoading) {
      if (pid) {
        SchoolApi.RSchoolWithSeasons(pid)
          .then((res) => {
            // console.log("res is ", res);
            setSchoolData(res.school);
            setSeasonList(res.seasons || []);
          })
          .catch(() => {
            setIsSchool(false);
          });
      } else {
        setSchoolData(currentSchool);
        SeasonApi.RSeasons({ school: currentSchool.school })
          .then((res) => setSeasonList(res || []))
          .catch(() => {
            setIsSchool(false);
          });
      }

      setIsLoading(false);
    }
  }, [isLoading]);

  if (!isSchool) {
    return <CannotFindSchool />;
  }
  return (
    <>
      <Navbar />
      <div className={style.section}>
        {/* <NavigationLinks /> */}

        <div className={style.title}>
          {schoolData !== undefined ? (
            schoolData.schoolName
          ) : (
            <Skeleton height="22px" width="20%" />
          )}
        </div>
        {schoolData && (
          <Tab
            items={{
              // "기본 정보": <BasicInfo schoolData={schoolData} />,
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
                <Links schoolData={schoolData} setSchoolData={setSchoolData} />
              ),
              일정: (
                <Calendars
                  schoolData={schoolData}
                  setSchoolData={setSchoolData}
                />
              ),
            }}
          />
        )}
      </div>
    </>
  );
};

export default School;
