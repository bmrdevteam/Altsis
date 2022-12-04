/**
 * @file Courses Edit Page
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
import { useNavigate } from "react-router-dom";
import useDatabase from "hooks/useDatabase";
import { useAuth } from "contexts/authContext";

import style from "style/pages/courses/courseDesign.module.scss";

// components
import Button from "components/button/Button";
import Autofill from "components/input/Autofill";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";
import Select from "components/select/Select";

import EditorParser from "editor/EditorParser";

import _ from "lodash";

type Props = {
  courseData: any;
  setMode: any;
  setCourseData: any;
};

const CourseDesign = (props: Props) => {
  const { currentUser, currentSeason } = useAuth();
  const database = useDatabase();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingRef, setIsLoadingRef] = useState<boolean>(false);

  /* additional document list */
  const [syllabusList, setSyllabusList] = useState<any>();
  const [teacherList, setTeacherList] = useState<any>();

  const [courseSubject, setCourseSubject] = useState<string>(
    _.join(props.courseData.subject, "/")
  );
  const [courseTitle, setCourseTitle] = useState<string>(
    props.courseData.classTitle
  );
  const [courseMentor, setCourseMentor] = useState<string>(
    JSON.stringify({
      userId: props.courseData.teachers[0].userId,
      userName: props.courseData.teachers[0].userName,
    })
  );
  const [coursePoint, setCoursePoint] = useState<string>(
    props.courseData.point
  );
  const [courseTime, setCourseTime] = useState<any>([
    ...props.courseData.time.map((timeBlock: any) => timeBlock.label),
  ]);
  const [courseClassroom, setCourseClassroom] = useState<string>(
    props.courseData.classroom
  );
  const [courseMoreInfo, setCourseMoreInfo] = useState<any>(
    props.courseData.info
  );

  const courseClassroomRef = useRef<any>("");
  const courseTimeRef = useRef<any>({});

  const [timeSelectPopupActive, setTimeSelectPopupActive] =
    useState<boolean>(false);

  async function getTeachers() {
    const { registrations: res } = await database.R({
      location: `registrations?role=teacher&season=${currentSeason?._id}`,
    });
    return res;
  }

  const updateRef = () => {
    courseTimeRef.current = {};
    for (let lb of courseTime) {
      courseTimeRef.current[lb] = true;
    }
    courseClassroomRef.current = courseClassroom;
  };

  async function getSyllabusByClassroom(classroom: string) {
    const { syllabuses: res } = await database.R({
      location: `syllabuses?season=${currentSeason._id}&classroom=${classroom}`,
    });
    return res;
  }

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

  async function setData() {
    const res = await getTeachers();
    setTeacherList([...res]);
    setCourseTime([
      ...props.courseData.time.map((timeBlock: any) => timeBlock.label),
    ]);
    setCourseClassroom(props.courseData.classroom);
  }

  async function update() {
    let submitObject = {
      season: currentSeason._id,
      classTitle: courseTitle,
      point: coursePoint,
      subject: courseSubject.split("/"),
      teachers: [JSON.parse(courseMentor)],
      classroom: courseClassroom,
      time: courseTime.map((lb: string) => {
        return { label: lb };
      }),
      info: courseMoreInfo,
    };
    const res = await database.U({
      location: `syllabuses/${props.courseData._id}`,
      data: { new: submitObject },
    });

    return res;
  }

  const teachers = () => {
    const res = [{ text: "", value: "" }];
    for (let i = 0; i < teacherList?.length; i++) {
      res.push({
        text: `${teacherList[i].userName}(${teacherList[i].userId})`,
        value: JSON.stringify({
          userId: teacherList[i].userId,
          userName: teacherList[i].userName,
        }),
      });
    }

    return res;
  };
  const subjects = () => {
    const res = [];
    for (let i = 0; i < currentSeason?.subjects.data.length; i++) {
      const value = _.join(currentSeason?.subjects.data[i], "/");
      res.push({
        text: value,
        value,
      });
    }
    return res;
  };

  useEffect(() => {
    setData()
      .then((res) => {
        updateRef();
        setIsLoading(false);
      })
      .catch((err) => {
        alert("failed to load data");
        navigate("/courses");
      });
  }, []);

  useEffect(() => {
    if (isLoadingRef) {
      updateRef();
      setIsLoadingRef(false);
    }
    return () => {};
  }, [isLoadingRef]);

  return !isLoading && !isLoadingRef ? (
    <>
      <div className={style.section}>
        <div className={style.design_form}>
          <div className={style.title}>강의계획서 수정</div>
          <div style={{ display: "flex", gap: "24px" }}>
            <Select
              appearence="flat"
              label={_.join(currentSeason?.subjects.label, "/")}
              required
              setValue={setCourseSubject}
              options={subjects()}
              defaultSelectedValue={courseSubject}
            />
          </div>
          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Input
              appearence="flat"
              label="수업명"
              required={true}
              onChange={(e: any) => {
                setCourseTitle(e.target.value);
              }}
              defaultValue={courseTitle}
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
              options={teachers()}
              label="멘토 선택"
              setState={setCourseMentor}
              required
              defaultValue={courseMentor}
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
                defaultValue={coursePoint}
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
          <EditorParser
            auth="edit"
            onChange={(data) => {
              setCourseMoreInfo(data);
            }}
            defaultValues={courseMoreInfo}
            data={currentSeason?.formSyllabus}
          />

          <Button
            style={{ marginTop: "24px" }}
            type="ghost"
            onClick={() => {
              update()
                .then((res: any) => {
                  alert("sucess");
                  props.setCourseData(res.data);
                  props.setMode("view");
                })
                .catch((err) => {
                  alert(err.response.body.message);
                });
            }}
          >
            수정
          </Button>

          <Button
            style={{ marginTop: "24px" }}
            type="ghost"
            onClick={() => {
              props.setMode("view");
            }}
          >
            취소
          </Button>
        </div>
      </div>

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
                setIsLoadingRef(true);
                setCourseClassroom(courseClassroomRef.current);
                setCourseTime([
                  ...Object.keys(
                    Object.fromEntries(
                      Object.entries(courseTimeRef.current).filter(
                        ([key, value]) => value
                      )
                    )
                  ),
                ]);
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
              courseClassroomRef.current = e;
              getSyllabusByClassroom(e).then((res) => {
                setSyllabusList(
                  res.filter((syllabus: any) => {
                    return syllabus._id !== props.courseData._id;
                  })
                );
              });
              courseTimeRef.current = [];
            }}
            defaultSelectedValue={courseClassroom}
            label="강의실 선택"
            required
          />
          <div style={{ height: "24px" }}></div>
          <EditorParser
            auth="edit"
            onChange={(data) => {
              Object.assign(courseTimeRef.current, data);
            }}
            defaultTimetable={syllabusToTime(syllabusList)}
            defaultValues={courseTimeRef.current}
            data={currentSeason?.formTimetable}
          />
        </Popup>
      )}
    </>
  ) : (
    <>로딩중</>
  );
};

export default CourseDesign;
