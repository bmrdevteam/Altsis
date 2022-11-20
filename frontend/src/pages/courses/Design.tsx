/**
 * @file Courses Design Page
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

import Tab from "components/tab/Tab";
import Navbar from "layout/navbar/Navbar";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/button/Button";
import Autofill from "../../components/input/Autofill";
import Input from "../../components/input/Input";
import NavigationLinks from "../../components/navigationLinks/NavigationLinks";
import Popup from "../../components/popup/Popup";
import Select from "../../components/select/Select";
import { useAuth } from "../../contexts/authContext";
import EditorParser from "../../editor/EditorParser";
import useDatabase from "../../hooks/useDatabase";

import style from "../../style/pages/courses/courseDesign.module.scss";
type Props = {};

const CourseDesign = (props: Props) => {
  const { currentSchool, currentUser, currentSeason } = useAuth();
  const database = useDatabase();
  const navigate = useNavigate();

  const [teachers, setTeachers] = useState<any>();
  const [syllabus, setSyllabus] = useState<any>();
  const [alertPopupActive, setAlertPopupActive] = useState<boolean>(false);
  const [timeSelectPopupActive, setTimeSelectPopupActive] =
    useState<boolean>(false);

  async function getTeachers(id: string) {
    const { registrations: res } = await database.R({
      location: `registrations?role=teacher&season=${id}`,
    });
    return res;
  }
  useEffect(() => {
    if (currentSchool === null || currentSchool === undefined) {
      setAlertPopupActive(true);
    }
  }, []);
  async function getSyllabusByClassroom(classroom: string) {
    const { syllabuses: res } = await database.R({
      location: `syllabuses?season=${currentSeason._id}&classroom=${classroom}`,
    });
    return res;
  }

  useEffect(() => {
    getTeachers(currentSeason?._id).then((res) => {
      setTeachers(res);
      console.log(res);
    });
    setCourseTime("");
  }, [currentSeason]);

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

  async function submit() {
    let submitObject = {
      season: currentSeason._id,
      classTitle: courseTitle,
      point: coursePoint,
      teachers: [courseMentor],
    };
    Object.assign(submitObject, courseMoreInfo);

    console.log(submitObject);

    // const res = await database.C({
    //   location: "syllabuses",
    //   data: submitObject,
    // });

    // return res;
  }

  const [courseTitle, setCourseTitle] = useState<string>();
  const [courseMentor, setCourseMentor] = useState<string>();
  const [coursePoint, setCoursePoint] = useState<string>();
  const [courseTime, setCourseTime] = useState<any>();
  const [courseMoreInfo, setCourseMoreInfo] = useState<any>({});
  const courseTimeRef = useRef<any>({});
  const [courseClassroom, setCourseClassroom] = useState<string>();

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.design_form}>
          <div className={style.title}>수업 개설</div>
          <div style={{ display: "flex", gap: "24px" }}>
            <Input
              appearence="flat"
              label="수업명"
              required={true}
              onChange={(e: any) => {
                setCourseTitle(e.target.value);
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Input
              appearence="flat"
              label="작성자"
              required={true}
              disabled
              defaultValue={currentUser?.userName}
            />
            <Autofill
              appearence="flat"
              options={[
                { text: "", value: "" },
                ...(teachers?.map((val: any) => ({
                  value: val,
                  text: `${val?.userName} / ${val?.userId}`,
                })) ?? ""),
              ]}
              label="멘토 선택"
              setState={setCourseMentor}
              required
            />

            <div style={{ display: "flex", flex: "1 1 0", gap: "24px" }}>
              <Input
                type="number"
                appearence="flat"
                label="학점"
                required={true}
                onChange={(e: any) => {
                  setCoursePoint(e.target.value);
                }}
              />
            </div>
          </div>
          <Button
            style={{ flex: "1 1 0 ", marginTop: "24px" }}
            type="ghost"
            onClick={() => {
              setTimeSelectPopupActive(true);
            }}
          >
            강의실 및 시간 선택
          </Button>
          <div style={{ display: "flex", marginTop: "20px", gap: "24px" }}>
            <Input
              appearence="flat"
              label="강의실"
              defaultValue={courseClassroom}
              required={true}
              disabled
            />
            <Input
              appearence="flat"
              label="시간"
              defaultValue={courseTime}
              required={true}
              disabled
            />
          </div>
          <div style={{ display: "flex", marginTop: "24px" }}></div>
          {/* <EditorParser data={currentSeason?.formTimetable} /> */}
          <EditorParser
            auth="edit"
            // onChange={(data) => {
            //   setCourseMoreInfo(data);
            // }}
            defaultValues={courseMoreInfo}
            data={currentSeason?.formSyllabus}
          />
          <Button
            style={{ marginTop: "24px" }}
            type="ghost"
            onClick={() => {
              submit();
            }}
          >
            제출
          </Button>
        </div>
      </div>

      {alertPopupActive && (
        <Popup setState={() => {}} title="가입된 학교가 없습니다">
          <div style={{ marginTop: "24px" }}>
            <Button
              type="ghost"
              onClick={() => {
                navigate("/");
              }}
            >
              메인 화면으로 돌아가기
            </Button>
          </div>
        </Popup>
      )}
      {timeSelectPopupActive && (
        <Popup
          setState={setTimeSelectPopupActive}
          title="강의실 및 시간 선택"
          closeBtn
          style={{ borderRadius: "4px", width: "900px" }}
          footer={
            <Button
              type="ghost"
              onClick={() => {
                setCourseTime(
                  Object.keys(
                    Object.fromEntries(
                      Object.entries(courseTimeRef.current).filter(
                        ([key, value]) => value
                      )
                    )
                  )
                );
                setTimeSelectPopupActive(false);
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
              ...currentSeason.classrooms?.map((val: any) => {
                return { value: val, text: val };
              }),
            ]}
            onChange={(e: any) => {
              setCourseClassroom(e);
              getSyllabusByClassroom(e).then((res) => {
                setSyllabus(res);
                console.log(res);
              });
            }}
            label="강의실 선택"
            required
          />
          <div style={{ height: "24px" }}></div>
          <EditorParser
            auth="edit"
            onChange={(data) => {
              Object.assign(courseTimeRef.current, data);
              console.log(data);
            }}
            defaultTimetable={syllabusToTime(syllabus)}
            defaultValues={courseTimeRef.current}
            data={currentSeason?.formTimetable}
          />
        </Popup>
      )}
    </>
  );
};

export default CourseDesign;
