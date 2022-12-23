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

import style from "style/pages/admin/schools.module.scss";

// components
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Tab from "components/tab/Tab";

// tab elements
import BasicInfo from "./tab/BasicInfo";
import Classroom from "./tab/classrooms/Classroom";
import Season from "./tab/seasons/Season";
import Subject from "./tab/subjects/Subject";
import useDatabase from "../../../hooks/useDatabase";
import Setting from "./tab/Setting";
import Skeleton from "../../../components/skeleton/Skeleton";
import Timetable from "./tab/Timetable";
import Archive from "./tab/Archive";
import Form from "./tab/Form";
import Permission from "./tab/Permission";
import User from "./tab/users/User";

import { useAuth } from "contexts/authContext";

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
  const { currentUser, currentSchool } = useAuth();

  const database = useDatabase();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [schoolData, setSchoolData] = useState<any>();
  const [isSchool, setIsSchool] = useState<boolean>(true);

  async function getSchool() {
    const res = await database.R({ location: `schools/${pid}` });
    return res;
  }

  useEffect(() => {
    if (isLoading) {
      if (pid) {
        getSchool()
          .then((res) => {
            console.log(res);
            setSchoolData(res);
          })
          .catch(() => {
            setIsSchool(false);
          });
      } else {
        setSchoolData(currentSchool);
      }

      setIsLoading(false);
    }
  }, [isLoading]);

  if (!isSchool) {
    return <CannotFindSchool />;
  }
  return (
    <div className={style.section}>
      <NavigationLinks />

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
            "기본 정보": <BasicInfo schoolData={schoolData} />,
            학기: <Season />,
            사용자: <User schoolData={schoolData} />,
            교과목: (
              <Subject schoolData={schoolData} setSchoolData={setSchoolData} />
            ),
            강의실: (
              <Classroom
                schoolData={schoolData}
                setSchoolData={setSchoolData}
              />
            ),
            양식: <Form schoolData={schoolData} />,
            권한: (
              <Permission
                schoolData={schoolData}
                setSchoolData={setSchoolData}
              />
            ),
            "시간표(beta)": <Timetable />,
            "학생정보 관리(archive)": <Archive schoolData={schoolData} />,
          }}
        />
      )}
    </div>
  );
};

export default School;
