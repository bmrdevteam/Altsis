/**
 * @file Classroom view
 * @page 강의실 현황
 *
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
import { useAuth } from "contexts/authContext";

// components
import Select from "components/select/Select";
import EditorParser from "editor/EditorParser";

import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import CourseView from "pages/courses/view/ViewPopup";
import Navbar from "layout/navbar/Navbar";

import style from "style/pages/admin/schools.module.scss";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";

type Props = {};

const Index = (props: Props) => {
  const { currentSeason } = useAuth();
  const { SyllabusAPI } = useAPIv2();

  const [syllabusList, setSyllabusList] = useState<any[]>([]);

  const [coursePopupActive, setCoursePoupActive] = useState<boolean>(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  const updateSyllabusList = async (classroom: string) => {
    if (!classroom || classroom === "") return setSyllabusList([]);
    try {
      const { syllabuses } = await SyllabusAPI.RSyllabuses({
        query: {
          season: currentSeason?._id,
          classroom,
        },
      });
      setSyllabusList(syllabuses);
    } catch (err) {
      ALERT_ERROR(err);
      setSyllabusList([]);
    }
  };

  function syllabusLabelByTime(s: any) {
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
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>강의실 현황</div>
        <div style={{ height: "12px" }}></div>
        <Select
          appearence="flat"
          options={[
            { value: "", text: "" },
            ...currentSeason?.classrooms.map((val: any) => {
              return { value: val, text: val };
            }),
          ]}
          onChange={(classroom: string) => {
            updateSyllabusList(classroom);
          }}
          defaultSelectedValue={""}
          label="강의실 선택"
          required
        />
        <div style={{ height: "24px" }}></div>
        <EditorParser
          type="timetable"
          auth="view"
          defaultTimetable={syllabusLabelByTime(syllabusList)}
          idTimetable={syllabusIdByTime(syllabusList)}
          onClickCourse={(id: string) => {
            setSelectedCourseId(id);
            setCoursePoupActive(true);
          }}
          data={currentSeason?.formTimetable}
        />
      </div>
      {coursePopupActive && selectedCourseId !== "" && (
        <CourseView
          setPopupActive={setCoursePoupActive}
          course={selectedCourseId}
        />
      )}
    </>
  );
};

export default Index;
