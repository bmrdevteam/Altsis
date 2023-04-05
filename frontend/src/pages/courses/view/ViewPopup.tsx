/**
 * @file Courses View Page
 *
 * more info on selected courses
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
import useDatabase from "hooks/useDatabase";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";

import style from "style/pages/courses/course.module.scss";

// components
import Divider from "components/divider/Divider";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import EditorParser from "editor/EditorParser";

import _ from "lodash";
import { useNavigate } from "react-router-dom";
import Button from "components/button/Button";
type Props = {
  setPopupActive: any;
  course: string;
  hideStudentList?: boolean;
  byMentor?: boolean;
};

const CourseView = (props: Props) => {
  const { currentSeason } = useAuth();
  const database = useDatabase();
  const navigate = useNavigate();
  const { EnrollmentApi } = useApi();

  const [confirmStatusPopupActive, setConfirmStatusPopupActive] =
    useState<boolean>(false);

  const [courseData, setCourseData] = useState<any>();
  const [confirmed, setConfirmed] = useState<boolean>(true);
  const [confirmedStatus, setConfirmedStatus] =
    useState<string>("notConfirmed");

  const [enrollments, setEnrollments] = useState<any[]>();

  const categories = () => {
    return (
      <>
        {currentSeason?.subjects?.label && (
          <div className={style.category}>
            {_.join(currentSeason?.subjects.label, "/")}:{" "}
            {_.join(courseData.subject, "/")}
          </div>
        )}{" "}
        <div className={style.category}>
          강의실: {courseData.classroom || "없음"}
        </div>
        <div className={style.category}>
          시간:{" "}
          {_.join(
            courseData.time.map((timeBlock: any) => timeBlock.label),
            ", "
          )}
        </div>
        <div className={style.category}>학점: {courseData.point}</div>
        <div className={style.category}>수강정원: {courseData.limit}</div>
        <div className={style.category}>개설자: {courseData.userName}</div>
        <div className={style.category}>
          멘토:{" "}
          {_.join(
            courseData.teachers?.map((teacher: any) => teacher.userName),
            ", "
          )}
        </div>
        <div
          className={style.category}
          onClick={() => {
            setConfirmStatusPopupActive(true);
          }}
        >
          상태:{" "}
          {confirmedStatus === "fullyConfirmed"
            ? "승인됨"
            : confirmedStatus === "notConfirmed"
            ? "미승인"
            : "승인중"}
        </div>
      </>
    );
  };

  async function getCourse(_id: string) {
    const res = await database.R({
      location: `syllabuses/${props.course}`,
    });

    return res;
  }

  useEffect(() => {
    if (courseData) {
      if (courseData.season !== currentSeason._id) {
        navigate("/courses", { replace: true });
      }
      // is this syllabus fully confirmed?
      for (let teacher of courseData.teachers) {
        if (!teacher.confirmed) {
          setConfirmed(false);
          break;
        }
      }
      const confirmedCnt = _.filter(courseData.teachers, {
        confirmed: true,
      }).length;
      setConfirmedStatus(
        confirmedCnt === 0
          ? "notConfirmed"
          : confirmedCnt === courseData.teachers.length
          ? "fullyConfirmed"
          : "semiConfirmed"
      );

      EnrollmentApi.REnrolllments({ syllabus: props.course }).then(
        (res: any) => {
          setEnrollments(_.sortBy(res, ["createdAt"]));
        }
      );
    }

    return () => {};
  }, [courseData]);

  const ClassInfo = () => {
    return (
      <EditorParser
        type="syllabus"
        auth="view"
        defaultValues={courseData.info}
        data={currentSeason?.formSyllabus}
      />
    );
  };

  useEffect(() => {
    getCourse(props.course).then((res) => {
      setCourseData(res);
    });
    return () => {};
  }, []);

  return (
    courseData && (
      <Popup
        setState={props.setPopupActive}
        title={courseData.classTitle}
        closeBtn
        contentScroll
        style={{ borderRadius: "4px", width: "900px" }}
      >
        <div className={style.section}>
          <div className={style.categories_container}>
            <div className={style.categories}>{categories()}</div>
          </div>
          <Divider />
          <ClassInfo />
          <div style={{ height: "24px" }}></div>
          <Divider />

          {props?.byMentor && (
            <>
              <Button
                type={"ghost"}
                style={{
                  borderRadius: "4px",
                  height: "32px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                  marginTop: "12px",
                }}
                onClick={() => {
                  navigate(`/courses/edit/${props.course}?byMentor=true`, {
                    replace: true,
                  });
                }}
                disabled={confirmed}
              >
                수정
              </Button>
            </>
          )}

          {!props?.hideStudentList && (
            <>
              <Divider />
              <div style={{ height: "24px" }}></div>
              <div className={style.title}>수강생 목록</div>

              <Table
                type="object-array"
                data={enrollments || []}
                header={[
                  {
                    text: "No",
                    type: "text",
                    key: "tableRowIndex",
                    width: "48px",
                    textAlign: "center",
                  },
                  {
                    text: "학년",
                    key: "studentGrade",
                    type: "text",
                    textAlign: "center",
                  },
                  {
                    text: "ID",
                    key: "studentId",
                    type: "text",
                    textAlign: "center",
                  },
                  {
                    text: "이름",
                    key: "studentName",
                    type: "text",
                    textAlign: "center",
                  },
                ]}
              />
            </>
          )}

          {confirmStatusPopupActive && (
            <Popup
              setState={setConfirmStatusPopupActive}
              title="승인 상태"
              closeBtn
            >
              <Table
                type="object-array"
                data={courseData.teachers}
                header={[
                  {
                    text: "No",
                    type: "text",
                    key: "tableRowIndex",
                    width: "48px",
                    textAlign: "center",
                  },
                  {
                    text: "멘토 ID",
                    key: "userId",
                    type: "text",
                    textAlign: "center",
                  },
                  {
                    text: "멘토 이름",
                    key: "userName",
                    type: "text",
                    textAlign: "center",
                  },

                  {
                    text: "상태",
                    key: "confirmed",
                    width: "120px",
                    textAlign: "center",
                    type: "status",
                    status: {
                      false: { text: "미승인", color: "red" },
                      true: { text: "승인됨", color: "green" },
                    },
                  },
                ]}
              />
            </Popup>
          )}
        </div>
      </Popup>
    )
  );
};

export default CourseView;
