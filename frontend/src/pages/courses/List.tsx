/**
 * @file Courses List Page
 * @page 수업 목록 페이지
 *
 * @author jessie129j <jessie129j@gmail.com>
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
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";

import style from "style/pages/enrollment.module.scss";

// navigation bar
import Navbar from "layout/navbar/Navbar";

import _ from "lodash";
import Loading from "components/loading/Loading";

import CourseTable from "./table/CourseTable";

type Props = {};

const Courses = (props: Props) => {
  const navigate = useNavigate();
  const { SyllabusApi } = useApi();

  const { currentSeason, currentRegistration } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [courseList, setCourseList] = useState<any[]>([]);

  async function getCreatedCourseList() {
    const { syllabuses } = await SyllabusApi.RSyllabuses({
      season: currentRegistration?.season,
    });
    return syllabuses;
  }

  useEffect(() => {
    if (isLoading) {
      if (!currentRegistration) {
        alert("등록된 학기가 없습니다.");
        navigate("/");
      } else {
        getCreatedCourseList().then((res: any) => {
          setCourseList(res);
          setIsLoading(false);
        });
      }
    }
  }, [isLoading]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>수업 목록</div>
        <div style={{ height: "24px" }}></div>
        {!isLoading ? (
          <CourseTable
            defaultPageBy={50}
            data={courseList}
            subjectLabels={currentSeason?.subjects?.label ?? []}
            preHeaderList={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
                whiteSpace: "pre",
              },
            ]}
            showStatus={true}
          />
        ) : (
          <Loading height={"calc(100vh - 55px)"} />
        )}
      </div>
    </>
  );
};

export default Courses;
