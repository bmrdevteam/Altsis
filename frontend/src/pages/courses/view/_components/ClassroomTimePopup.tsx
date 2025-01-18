/**
 * @file Mentoring teacher popup
 * @page 수업 개설/수정 뷰 - 강의계획서 시간&강의실 수정 팝업
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
import { useEffect, useRef, useState } from "react";
import { useAuth } from "contexts/authContext";

// components
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import Select from "components/select/Select";
import EditorParser from "editor/EditorParser";
import _ from "lodash";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import CourseView from "../ViewPopup";

type Props = {
  syllabus?: string;
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  classroom: string;
  strictMode?: boolean;
  setClassroom: React.Dispatch<React.SetStateAction<string>>;
  time: {
    label: string;
    day: string;
    start: string;
    end: string;
  }[];
  setTime: React.Dispatch<
    React.SetStateAction<
      {
        label: string;
        day: string;
        start: string;
        end: string;
      }[]
    >
  >;
};

const Index = (props: Props) => {
  const { currentSeason } = useAuth();
  const { SyllabusAPI } = useAPIv2();

  const [classroom, setClassroom] = useState<string>(props.classroom);
  const timeRef = useRef<{ [key: string]: any }>({});

  const [syllabusList, setSyllabusList] = useState<any[]>([]);

  const [coursePopupActive, setCoursePoupActive] = useState<boolean>(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [availableClassrooms, setAvailableClassrooms] = useState<any[]>([]);

  const updateSyllabusList = async () => {
    if (classroom === "") return setSyllabusList([]);
    try {
      const { syllabuses } = await SyllabusAPI.RSyllabuses({
        query: {
          season: currentSeason?._id,
          classroom,
        },
      });
      if (props.syllabus) {
        const idx = _.findIndex(syllabuses, { _id: props.syllabus });
        if (idx !== -1) {
          syllabuses.splice(idx, 1);
        }
      }
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


  function getAvailableClassrooms() {
    Promise.all(
      currentSeason?.classrooms.map(async (value) => {
        const { syllabuses } = await SyllabusAPI.RSyllabuses({
          query: {
            season: currentSeason._id,
            classroom: value,
          },
        });
    
        const isAvailable = Object.keys(timeRef.current).filter((label) =>
          Object.keys(syllabusLabelByTime(syllabuses)).includes(label)
        ).length === 0;
    
        return isAvailable ? value : null; // 조건에 맞으면 value를 반환, 아니면 null
      })
    ).then((results) => {
      // 상태를 불변성을 유지하며 업데이트
      setAvailableClassrooms(results.filter(Boolean));
    });
    setAvailableClassrooms(availableClassrooms);
  }

  useEffect(() => {
    updateSyllabusList();
    return () => {};
  }, [classroom]);

  useEffect(() => {
    timeRef.current = _.keyBy(props.time, "label");
    return () => {};
  }, [props.time]);

  useEffect(() => {
    getAvailableClassrooms();
  }, [currentSeason, props.time]);

  return (
    <>
      <Popup
        contentScroll
        setState={props.setPopupActive}
        title="강의실 및 시간 선택"
        closeBtn
        style={{ width: "900px" }}
        footer={
          <Button
            type="ghost"
            onClick={() => {
              props.setClassroom(classroom);
              props.setTime(Object.values(timeRef.current));
              props.setPopupActive(false);
            }}
          >
            선택
          </Button>
        }
      >          
      {props.strictMode ? (
        <Select
          appearence="flat"
          options={[
            { value: "", text: "" },
            ...availableClassrooms.map((val: any) => {
              return { value: val, text: val };
            }),
          ]}
          onChange={(e: any) => {
            setClassroom(e);
          }}
          defaultSelectedValue={props.classroom}
          label="강의실 선택 (Strict Mode)"
          required
        />
      ) : (
        <Select
          appearence="flat"
          options={[
            { value: "", text: "" },
            ...currentSeason?.classrooms.map((val: any) => {
              return { value: val, text: val };
            }),
          ]}
          onChange={(e: any) => {
            setClassroom(e);
            timeRef.current = {};
          }}
          defaultSelectedValue={props.classroom}
          label="강의실 선택"
        />
      )}
        <div style={{ height: "24px" }}></div>
        <EditorParser
          type="timetable"
          auth="edit"
          onChange={(data) => {
            timeRef.current = data;
          }}
          defaultTimetable={syllabusLabelByTime(syllabusList)}
          idTimetable={syllabusIdByTime(syllabusList)}
          onClickCourse={(id: string) => {
            setSelectedCourseId(id);
            setCoursePoupActive(true);
          }}
          defaultValues={timeRef.current}
          data={currentSeason?.formTimetable}
          strictMode={props.strictMode}
        />
      </Popup>
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
