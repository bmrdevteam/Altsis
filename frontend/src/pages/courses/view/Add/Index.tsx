/**
 * @file Course Design View
 * @page 수업 개설 뷰
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
import { useAuth } from "contexts/authContext";
import style from "style/pages/courses/courseDesign.module.scss";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";

import EditorParser from "editor/EditorParser";

import _ from "lodash";
import Loading from "components/loading/Loading";
import Svg from "assets/svg/Svg";

import PastePopup from "pages/courses/view/_components/PastePopup";
import MentoringTeacherPopup from "pages/courses/view/_components/MentoringTeacherPopup";
import ClassroomTimePopup from "pages/courses/view/_components/ClassroomTimePopup";
import SubjectSelect from "pages/courses/view/_components/SubjectSelect";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {};

const CourseAdd = (props: Props) => {
  const { currentUser, currentSeason, currentRegistration } = useAuth();
  const navigate = useNavigate();
  const { SyllabusAPI } = useAPIv2();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [courseSubject, setCourseSubject] = useState<string[]>([]);
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [courseMentorList, setCourseMentorList] = useState<
    { _id: string; userId: string; userName: string }[]
  >([]);

  const [coursePoint, setCoursePoint] = useState<string>("");
  const [courseTime, setCourseTime] = useState<
    { label: string; day: string; start: string; end: string }[]
  >([]);
  const [courseClassroom, setCourseClassroom] = useState<string>("");
  const [courseLimit, setCourseLimit] = useState<string>("");
  const courseMoreInfo = useRef<any>({});

  const [timeSelectPopupActive, setTimeSelectPopupActive] =
    useState<boolean>(false);
  const [mentorSelectPopupActive, setMentorSelectPopupActive] =
    useState<boolean>(false);

  const [pastePopupActive, setPastePopupActive] = useState<boolean>(false);

  const pasteSyllabus = (syllabus: string) => {
    SyllabusAPI.RSyllabus({ params: { _id: syllabus } })
      .then(({ syllabus }) => {
        setIsLoading(true);
        if (
          currentSeason?.subjects?.data &&
          _.find(currentSeason?.subjects?.data, (rawData) =>
            _.isEqual(rawData, syllabus.subject)
          )
        ) {
          setCourseSubject(syllabus.subject);
        }

        setCourseTitle(syllabus.classTitle);
        courseMoreInfo.current = syllabus.info;
      })
      .then(() => {
        setTimeout(() => setIsLoading(false), 300);
      });
  };

  useEffect(() => {
    setCoursePoint(`${Object.keys(courseTime).length}`);
    return () => {};
  }, [courseTime]);

  async function submit() {
    let filled = true;
    document
      .querySelectorAll("div[data-inputRequired=true]")
      .forEach((node) => {
        if (node.innerHTML === "" || node.innerHTML === undefined) {
          filled = false;
        }
      });
    if (filled) {
      try {
        const { syllabus } = await SyllabusAPI.CSyllabus({
          data: {
            season: currentSeason._id,
            classTitle: courseTitle,
            point: Number(coursePoint),
            subject: courseSubject,
            teachers: courseMentorList,
            classroom: courseClassroom,
            time: courseTime,
            info: courseMoreInfo.current,
            limit: Number(courseLimit),
          },
        });
        alert(SUCCESS_MESSAGE);
        navigate(`/courses/created/${syllabus._id}`, {
          replace: true,
        });
      } catch (err: any) {
        ALERT_ERROR(err);
        if (err.response.data?.message === "CLASSROOM_IN_USE") {
          setCourseClassroom("");
          setCourseTime([]);
        }
      }
    } else {
      return alert("강의계획서를 작성해주세요");
    }
  }

  useEffect(() => {
    if (currentRegistration?.role === "teacher") {
      setCourseMentorList([
        {
          _id: currentRegistration.user,
          userId: currentRegistration.userId,
          userName: currentRegistration.userName,
        },
      ]);
    }
  }, [currentRegistration]);

  return !isLoading ? (
    <>
      <div className={style.section}>
        <div className={style.design_form}>
          <div className={style.title}>수업 개설</div>
          <div
            style={{
              flex: "auto",
              marginRight: "12px",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            <div
              className={style.icon}
              onClick={() => {
                setPastePopupActive(true);
              }}
              title={"강의계획서 불러오기"}
              style={{ display: "flex", gap: "4px", cursor: "pointer" }}
            >
              <Svg type="paste" width="20px" height="20px" />
            </div>
          </div>
          <div key="subject-select-wrapper">
            <SubjectSelect
              subjectLabelList={currentSeason?.subjects?.label ?? []}
              subjectDataList={currentSeason?.subjects?.data ?? []}
              setSubject={setCourseSubject}
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
              key={"mentor-" + JSON.stringify(courseMentorList)}
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
          <div>
            <div style={{ display: "flex", marginTop: "20px", gap: "24px" }}>
              <Input
                key={"classroom-" + courseClassroom}
                appearence="flat"
                label="강의실"
                defaultValue={courseClassroom}
                required={true}
                disabled
              />
              <Input
                key={
                  "time-" +
                  _.join(
                    courseTime.map((timeBlock) => timeBlock.label),
                    ", "
                  )
                }
                appearence="flat"
                label="시간"
                defaultValue={_.join(
                  courseTime.map((timeBlock) => timeBlock.label),
                  ", "
                )}
                required={true}
                disabled
              />

              <Input
                key={`point-${coursePoint}`}
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
          </div>
          <div style={{ display: "flex", marginTop: "24px" }}></div>
          <EditorParser
            type={"syllabus"}
            auth="edit"
            onChange={(data) => {
              courseMoreInfo.current = data;
            }}
            defaultValues={courseMoreInfo.current}
            data={currentSeason?.formSyllabus}
          />

          <Button
            style={{ marginTop: "24px" }}
            type="ghost"
            onClick={() => {
              function isPositiveInteger(str: string) {
                const num = Number(str);
                return Number.isInteger(num) && num >= 0;
              }
              if (!courseSubject || courseSubject.includes("")) {
                alert("교과목을 입력해주세요.");
              } else if (!courseTitle || courseTitle === "") {
                alert("제목을 입력해주세요.");
              } else if (courseMentorList.length === 0) {
                alert("멘토를 선택해주세요.");
              } else if (courseTime.length === 0) {
                alert("시간을 선택해주세요.");
              } else if (!isPositiveInteger(coursePoint)) {
                alert("학점을 0 또는 양수로 입력해주세요.");
              } else if (!isPositiveInteger(courseLimit)) {
                alert("수강정원을 0 또는 양수로 입력해주세요.");
              } else submit();
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
        <ClassroomTimePopup
          setPopupActive={setTimeSelectPopupActive}
          classroom={courseClassroom}
          setClassroom={setCourseClassroom}
          time={courseTime}
          setTime={setCourseTime}
        />
      )}
      {mentorSelectPopupActive && (
        <MentoringTeacherPopup
          setPopupActive={setMentorSelectPopupActive}
          selectedTeachers={courseMentorList}
          setCourseMentorList={setCourseMentorList}
        />
      )}
      {pastePopupActive && (
        <PastePopup
          setPopupActive={setPastePopupActive}
          pasteFunc={pasteSyllabus}
        />
      )}
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default CourseAdd;
