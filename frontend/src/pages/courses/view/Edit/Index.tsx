/**
 * @file Course Edit View
 * @page 개설/멘토링 수업 수정 뷰
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
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "contexts/authContext";
import style from "style/pages/courses/course.module.scss";

import _ from "lodash";
import Input from "components/input/Input";
import Button from "components/button/Button";
import EditorParser from "editor/EditorParser";
import Loading from "components/loading/Loading";
import Callout from "components/callout/Callout";

import MentoringTeacherPopup from "pages/courses/view/_components/MentoringTeacherPopup";
import UpdatedEvaluationPopup from "pages/courses/view/_components/UpdatedEvaluationPopup";
import ClassroomTimePopup from "pages/courses/view/_components/ClassroomTimePopup";
import SubjectSelect from "pages/courses/view/_components/SubjectSelect";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {};

const CoursePid = (props: Props) => {
  const { pid } = useParams<"pid">();
  const [searchParams] = useSearchParams();
  const byMentor = searchParams.get("byMentor") === "true";
  const strictMode = searchParams.get("strictMode") === "true";

  const { SyllabusAPI } = useAPIv2();

  const navigate = useNavigate();
  const { currentUser, currentSeason } = useAuth();

  const [courseData, setCourseData] = useState<any>();

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [courseSubject, setCourseSubject] = useState<string[]>([]);
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [courseUserId, setCourseUserId] = useState<string>("");
  const [courseUserName, setCourseUserName] = useState<string>("");
  const [courseMentorList, setCourseMentorList] = useState<any[]>([]);

  const [coursePoint, setCoursePoint] = useState<string>("");
  const [courseTime, setCourseTime] = useState<
    { label: string; day: string; start: string; end: string }[]
  >([]);
  const [courseClassroom, setCourseClassroom] = useState<string>("");
  const [courseMoreInfo, setCourseMoreInfo] = useState<any>({});
  const [courseLimit, setCourseLimit] = useState<string>("");

  const [timeSelectPopupActive, setTimeSelectPopupActive] =
    useState<boolean>(false);
  const [mentorSelectPopupActive, setMentorSelectPopupActive] =
    useState<boolean>(false);

  const [changes, setChanges] = useState<any[]>([]);
  const [changesPoupActive, setChangesPopupActive] = useState<boolean>(false);

  async function update() {
    const res1 = await SyllabusAPI.USyllabus({
      params: { _id: courseData._id },
      data: {
        classTitle: courseTitle,
        point: Number(coursePoint),
        subject: courseSubject,
        teachers: courseMentorList,
        classroom: courseClassroom,
        time: courseTime,
        info: courseMoreInfo,
        limit: Number(courseLimit),
      },
    });
    const res2 = strictMode
      ? await SyllabusAPI.USyllabusSubject({
          params: { _id: courseData._id },
          data: {
            subject: courseSubject,
          },
        })
      : undefined;

    return { res1, res2 };
  }

  useEffect(() => {
    if (isLoading && currentSeason && currentUser && pid) {
      SyllabusAPI.RSyllabus({ params: { _id: pid } })
        .then(({ syllabus }) => {
          if (
            syllabus.user !== currentUser._id &&
            !_.find(syllabus.teachers, { _id: currentUser._id }) && currentUser.auth !== "manager"
          ) {
            navigate("/courses#개설%20수업", { replace: true });
          }
          setCourseData(syllabus);
          setCourseSubject(syllabus.subject);
          setCourseTitle(syllabus.classTitle);
          setCourseUserId(syllabus.userId);
          setCourseUserName(syllabus.userName);
          setCourseMentorList(syllabus.teachers || []);
          setCoursePoint(syllabus.point.toString());
          setCourseTime(syllabus.time);
          setCourseClassroom(
            currentSeason.classrooms.includes(syllabus.classroom)
              ? syllabus.classroom
              : ""
          );
          setCourseMoreInfo(syllabus.info || {});
          setCourseLimit(syllabus.limit.toString());
        })
        .then(() => {
          setIsLoading(false);
        })
        .catch((err) => {
          ALERT_ERROR(err);
          navigate("/courses");
        });
    }
    return () => {};
  }, [isLoading]);

  useEffect(() => {
    setCoursePoint(`${Object.keys(courseTime).length}`);
    return () => {};
  }, [courseTime]);

  return !isLoading ? (
    <>
      <div className={style.section}>
        <div className={style.design_form}>
          <div className={style.title}>강의계획서 수정</div>
          {strictMode && (
            <Callout
              style={{ marginBottom: "24px" }}
              type={"warning"}
              title={"수강생이 있는 강의계획서의 수정하는 경우"}
              child={
                <ol>
                  <li>
                    <b>교과목</b>을 변경하면 평가 정보가 변경될 수 있습니다.
                  </li>
                  <li>
                    <b>강의실 및 시간</b>을 변경할 수 없습니다.
                  </li>
                  <li>
                    <b>수강 정원</b>을 수강생 수보다 작게 변경할 수 없습니다.
                  </li>
                </ol>
              }
              showIcon
            />
          )}
          <div key="subject-select-wrapper">
            <SubjectSelect
              subjectLabelList={currentSeason?.subjects?.label ?? []}
              subjectDataList={currentSeason?.subjects?.data ?? []}
              defaultSubject={courseSubject}
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
              defaultValue={`${courseUserName}(${courseUserId})`}
            />

            <Input
              key={"mentor-" + JSON.stringify(courseMentorList)}
              appearence="flat"
              label="지도교사"
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
            disabled={strictMode}
            onClick={() => {
              setTimeSelectPopupActive(true);
            }}
          >
            강의실 및 시간 선택
          </Button>
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
              defaultValue={`${courseLimit}`}
            />
          </div>

          <div style={{ display: "flex", marginTop: "24px" }}></div>
          <EditorParser
            type="syllabus"
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
              function isPositiveInteger(str: string) {
                const num = Number(str);
                return Number.isInteger(num) && num >= 0;
              }
              if (!courseSubject || courseSubject.includes("")) {
                alert("교과목을 입력해주세요.");
              } else if (!courseTitle || courseTitle === "") {
                alert("제목을 입력해주세요.");
              } else if (courseMentorList.length === 0) {
                alert("지도교사를 선택해주세요.");
              } else if (Object.keys(courseTime).length === 0) {
                alert("시간을 선택해주세요.");
              } else if (!isPositiveInteger(coursePoint)) {
                alert("학점을 0 또는 양수로 입력해주세요.");
              } else if (!isPositiveInteger(courseLimit)) {
                alert("수강정원을 0 또는 양수로 입력해주세요.");
              } else
                update()
                  .then(({ res1, res2 }) => {
                    alert(SUCCESS_MESSAGE);
                    if (!byMentor)
                      navigate(`/courses/created/${pid}`, { replace: true });
                    if (byMentor) {
                      if (res2?.changes && res2.changes.length > 0) {
                        setChanges(res2.changes);
                        setChangesPopupActive(true);
                      } else {
                        navigate(`/courses/mentoring/${pid}`, {
                          replace: true,
                        });
                      }
                    }
                  })
                  .catch((err) => {
                    ALERT_ERROR(err);
                  });
            }}
          >
            수정
          </Button>

          <Button
            style={{ marginTop: "12px" }}
            type="ghost"
            onClick={() => {
              if (!byMentor)
                navigate(`/courses/created/${pid}`, { replace: true });
              if (byMentor)
                navigate(`/courses/mentoring/${pid}`, { replace: true });
            }}
          >
            취소
          </Button>
        </div>
      </div>

      {timeSelectPopupActive && (
        <ClassroomTimePopup
          syllabus={pid}
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
      {changesPoupActive && pid && (
        <UpdatedEvaluationPopup
          pid={pid}
          changes={changes}
          setPopupActive={setChangesPopupActive}
        />
      )}
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default CoursePid;
