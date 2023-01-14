/**
 * @file Course Index Page
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

import style from "style/pages/enrollment.module.scss";

import EditorParser from "editor/EditorParser";
import Divider from "components/divider/Divider";

type Props = { courseList: any[] };

const Timetable = (props: Props) => {
  const navigate = useNavigate();

  const { currentSeason, currentRegistration } = useAuth();

  useEffect(() => {
    if (!currentRegistration) {
      alert("등록된 학기가 없습니다.");
      navigate("/");
    }
    return () => {};
  }, [currentRegistration]);

  function syllabusToTime(s: any) {
    let result = {};
    if (s) {
      for (let i = 0; i < s.length; i++) {
        const element = s[i];
        for (let ii = 0; ii < element.time.length; ii++) {
          Object.assign(result, {
            [element.time[ii].label]: element.classTitle,
          });
        }
      }
    }

    return result;
  }

  return (
    <div className={style.section}>
      {currentSeason?.formTimetable && (
        <>
          <EditorParser
            auth="view"
            defaultTimetable={syllabusToTime(props.courseList)}
            data={currentSeason?.formTimetable}
          />
          <div style={{ height: "24px" }}></div>
          <Divider />
          <div style={{ height: "24px" }}></div>
        </>
      )}
    </div>
  );
};

export default Timetable;