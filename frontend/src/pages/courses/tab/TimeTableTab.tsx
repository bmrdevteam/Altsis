/**
 * @file Timetable Page
 * @page 수업 - 시간표(탭)
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
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";

import style from "style/pages/courses/course.module.scss";
import Divider from "components/divider/Divider";
import EditorParser from "editor/EditorParser";
import useApi from "hooks/useApi";

type Props = { courseList: any[] };
const Timetable = (props: Props) => {
  const { RegistrationApi } = useApi();
  const navigate = useNavigate();

  const { currentSeason, currentRegistration } = useAuth();

  useEffect(() => {
    if (!currentRegistration) {
      alert("등록된 학기가 없습니다.");
      navigate("/");
    }
    return () => {};
  }, [currentRegistration]);

  function syllabusLabelByTime(s: any) {
    let result = {};
    if (s) {
      for (let i = 0; i < s.length; i++) {
        const element = s[i];
        for (let ii = 0; ii < element.time.length; ii++) {
          Object.assign(result, {
            [element.time[ii].label]:
              element.classTitle + "(" + element.classroom + ")",
          });
        }
      }
    }

    return result;
  }

  function syllabusIdByTime(s: any) {
    let result = {};
    if (s) {
      for (let i = 0; i < s.length; i++) {
        const element = s[i];
        for (let ii = 0; ii < element.time.length; ii++) {
          Object.assign(result, {
            [element.time[ii].label]: element._id,
          });
        }
      }
    }

    return result;
  }

  return (
    <div className={style.section}>
      <div className={style.categories_container}> 
        <div className={style.categories}>
          <div className={style.category}
            onClick={() => {
              
            }}
          >
          일정추가
          </div>
        </div>
      </div>
      <Divider />
      {currentSeason?.formTimetable && (
        <>
          <EditorParser
            type={"timetable"}
            auth="view"
            defaultTimetable={syllabusLabelByTime(props.courseList)}
            idTimetable={syllabusIdByTime(props.courseList)}
            onClickCourse={(id: string) => {
              window.open("/courses/enrolled/" + id, "_blank");
            }}
            data={currentSeason?.formTimetable}
          />
          <div style={{ height: "12px" }}></div>
        </>
      )}
    </div>
  );
};

export default Timetable;
