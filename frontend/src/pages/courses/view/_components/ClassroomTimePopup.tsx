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
import useApi from "hooks/useApi";
import Select from "components/select/Select";
import EditorParser from "editor/EditorParser";
import _ from "lodash";

type Props = {
  syllabus?: string;
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  classroom: string;
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
  const { SyllabusApi } = useApi();

  const [classroom, setClassroom] = useState<string>(props.classroom);
  const timeRef = useRef<{ [key: string]: any }>({});

  const [classroomList, setClassroomList] = useState<string[]>([]);
  const [syllabusList, setSyllabusList] = useState<any[]>([]);

  const updateSyllabusList = async () => {
    if (classroom === "") return setSyllabusList([]);
    const { syllabuses } = await SyllabusApi.RSyllabuses({
      season: currentSeason?._id,
      classroom,
    });
    if (props.syllabus) {
      const idx = _.findIndex(syllabuses, { _id: props.syllabus });
      syllabuses.splice(idx, 1);
    }
    setSyllabusList(syllabuses);
  };

  function syllabusToTime(s: any) {
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

  useEffect(() => {
    if (currentSeason) {
      setClassroomList(currentSeason.classrooms);
    }

    return () => {};
  }, [currentSeason]);

  useEffect(() => {
    updateSyllabusList();
    return () => {};
  }, [classroom]);

  useEffect(() => {
    timeRef.current = _.keyBy(props.time, "label");
    return () => {};
  }, [props.time]);

  return (
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
      <Select
        appearence="flat"
        options={[
          { value: "", text: "" },
          ...classroomList.map((val: any) => {
            return { value: val, text: val };
          }),
        ]}
        onChange={(e: any) => {
          setClassroom(e);
          timeRef.current = {};
        }}
        defaultSelectedValue={props.classroom}
        label="강의실 선택"
        required
      />
      <div style={{ height: "24px" }}></div>
      <EditorParser
        type="timetable"
        auth="edit"
        onChange={(data) => {
          timeRef.current = data;
        }}
        defaultTimetable={syllabusToTime(syllabusList)}
        defaultValues={timeRef.current}
        data={currentSeason?.formTimetable}
      />
    </Popup>
  );
};

export default Index;
