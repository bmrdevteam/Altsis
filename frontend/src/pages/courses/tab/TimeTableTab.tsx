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
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";

import style from "style/pages/enrollment.module.scss";

import EditorParser from "editor/EditorParser";
import Divider from "components/divider/Divider";

import Svg from "assets/svg/Svg";
import { useReactToPrint } from 'react-to-print';

import { Tooltip } from 'react-tooltip'

import 'react-tooltip/dist/react-tooltip.css'

type Props = { courseList: any[] };
type PrintButtonProps = { onClick: () => void };

const PrintButton = ({ onClick }: PrintButtonProps ) => {
  return (
    <>
      <Tooltip id="timetable-tooltip" />
      <button
        data-tooltip-id="timetable-tooltip"
        data-tooltip-content="시간표 인쇄"
        className={style.printButton}
        onClick={onClick}
      >
      <Svg type="print" width="16" height="16" />
    </button>
      </>
  );
}

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

  const timetableRef = useRef(null);
  const handlePrint = useReactToPrint({
    content: () => timetableRef.current,
  });
  return (
    <div className={style.section}>
      {currentSeason?.formTimetable && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PrintButton onClick={handlePrint} />
          </div>
          <div ref={timetableRef}>
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
          </div>
          <div style={{ height: "24px" }}></div>
          <Divider />
          <div style={{ height: "24px" }}></div>
        </>
      )}
    </div>
  );
};

export default Timetable;
