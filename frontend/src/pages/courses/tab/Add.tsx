/**
 * @file Courses Add Page
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
import Table from "components/tableV2/Table";

import EditorParser from "editor/EditorParser";

import _ from "lodash";

type Props = {};

const CourseAdd = (props: Props) => {
  const { currentUser, currentSeason } = useAuth();
  const navigate = useNavigate();
  const database = useDatabase();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingRef, setIsLoadingRef] = useState<boolean>(false);

  /* additional document list */
  const [syllabusList, setSyllabusList] = useState<any>();
  const [teacherList, setTeacherList] = useState<any>();
  const selectedTeacherListRef = useRef<any[]>([]);

  const [courseSubject, setCourseSubject] = useState<string>("");
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [courseMentorList, setCourseMentorList] = useState<any[]>([]);
  const [coursePoint, setCoursePoint] = useState<string>();
  const [courseTime, setCourseTime] = useState<any>([]);
  const [courseClassroom, setCourseClassroom] = useState<string>("");
  const [courseMoreInfo, setCourseMoreInfo] = useState<any>();
  const [courseLimit, setCourseLimit] = useState<number>(0);

  const courseClassroomRef = useRef<any>("");
  const courseTimeRef = useRef<any>({});

  const [timeSelectPopupActive, setTimeSelectPopupActive] =
    useState<boolean>(false);
  const [mentorSelectPopupActive, setMentorSelectPopupActive] =
    useState<boolean>(false);

  async function getTeachers() {
    const { registrations: res } = await database.R({
      location: `registrations?season=${currentSeason?._id}&role=teacher`,
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
      location: `syllabuses?season=${currentSeason?._id}&classroom=${classroom}`,
    });
    return res;
  }

  useEffect(() => {
    setCoursePoint(courseTime.length);
    return () => {};
  }, [courseTime]);

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
    const res1 = await getTeachers();
    setTeacherList([...res1]);
  }

  async function submit() {
    let submitObject = {
      season: currentSeason?._id,
      classTitle: courseTitle,
      point: coursePoint,
      subject: courseSubject.split("/"),
      teachers: courseMentorList,
      classroom: courseClassroom,
      time: courseTime.map((lb: string) => {
        return { label: lb };
      }),
      info: courseMoreInfo,
      limit: courseLimit,
    };
    const res = await database.C({
      location: "syllabuses",
      data: submitObject,
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
    if (!currentSeason?.subjects) {
      return [{ text: "", value: "" }];
    }
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
      .then(() => {
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

  useEffect(() => {
    if (mentorSelectPopupActive) {
      selectedTeacherListRef.current = [];
    }
  }, [mentorSelectPopupActive]);

  return !isLoading && !isLoadingRef ? (
    <>
      <div className={style.section}>
        <div className={style.design_form}>
          <div className={style.title}>강의계획서 생성</div>
          <div style={{ display: "flex", gap: "24px" }}>
            {currentSeason?.subjects && (
              <Select
                appearence="flat"
                label={_.join(currentSeason?.subjects?.label, "/")}
                required
                setValue={setCourseSubject}
                options={subjects()}
                defaultSelectedValue={courseSubject}
              />
            )}
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
          <div
            style={{
              display: "flex",
              gap: "24px",
              marginTop: "24px",
              alignItems: "flex-end",
            }}
          >
            <Input
              appearence="flat"
              label="작성자"
              required={true}
              disabled
              defaultValue={`${currentUser?.userName}(${currentUser?.userId})`}
            />
            <Input
              appearence="flat"
              label="멘토"
              required
              defaultValue={_.join(
                courseMentorList.map(
                  (teacher: any) => `${teacher.userName}(${teacher.userId})`
                ),
                ", "
              )}
              disabled
            />
            <Button
              type="ghost"
              onClick={() => {
                setMentorSelectPopupActive(true);
              }}
            >
              수정
            </Button>
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

            <Input
              type="number"
              appearence="flat"
              label="학점"
              required={true}
              onChange={(e: any) => {
                setCoursePoint(e.target.value);
              }}
              defaultValue={`${coursePoint}`}
            />

            <Input
              type="number"
              appearence="flat"
              label="수강정원"
              required={true}
              onChange={(e: any) => {
                setCourseLimit(e.target.value);
              }}
              defaultValue={"0"}
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
              if (!courseTitle || courseTitle === "") {
                alert("제목을 입력해주세요.");
              } else if (courseMentorList.length === 0) {
                alert("멘토를 선택해주세요.");
              } else {
                submit()
                  .then((res: any) => {
                    alert("success");
                    navigate(`/courses/mylist/${res._id}`, {
                      replace: true,
                    });
                  })
                  .catch((err) => {
                    alert(err.response.data.message);
                  });
              }
            }}
          >
            생성
          </Button>

          <Button
            style={{ marginTop: "24px" }}
            type="ghost"
            onClick={() => {
              navigate("/courses");
            }}
          >
            취소
          </Button>
        </div>
      </div>

      {timeSelectPopupActive && (
        <Popup
          contentScroll
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
              ...currentSeason?.classrooms?.map((val: any) => {
                return { value: val, text: val };
              }),
            ]}
            onChange={(e: any) => {
              courseClassroomRef.current = e;
              getSyllabusByClassroom(e).then((res) => {
                setSyllabusList(res);
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

      {mentorSelectPopupActive && (
        <Popup
          contentScroll
          setState={setMentorSelectPopupActive}
          title="멘토 선택"
          closeBtn
          style={{ borderRadius: "4px", width: "900px" }}
          footer={
            <Button
              type="ghost"
              onClick={() => {
                setCourseMentorList(
                  selectedTeacherListRef.current.map((val: any) => {
                    return { userId: val.userId, userName: val.userName };
                  })
                );
                setMentorSelectPopupActive(false);
              }}
            >
              선택
            </Button>
          }
        >
          <Table
            data={teacherList}
            type="object-array"
            control
            onChange={(value: any[]) => {
              selectedTeacherListRef.current = _.filter(value, {
                tableRowChecked: true,
              });
            }}
            header={[
              {
                text: "checkbox",
                key: "",
                type: "checkbox",
                width: "48px",
              },

              {
                text: "선생님 ID",
                key: "userId",
                type: "text",
                textAlign: "center",
              },
              {
                text: "선생님 이름",
                key: "userName",
                type: "text",
                textAlign: "center",
              },
            ]}
          />
        </Popup>
      )}
    </>
  ) : (
    <>로딩중</>
  );
};

export default CourseAdd;
