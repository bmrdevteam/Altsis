/**
 * @file Courses List Page
 * @page 수업 목록 페이지
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
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";

import style from "style/pages/enrollment.module.scss";

// navigation bar
import Navbar from "layout/navbar/Navbar";

// components
import Table from "components/tableV2/Table";

import ViewPopup from "./view/ViewPopup";

import _ from "lodash";
import Loading from "components/loading/Loading";
import Popup from "components/popup/Popup";

type Props = {};

const Courses = (props: Props) => {
  const navigate = useNavigate();
  const { SyllabusApi } = useApi();

  const { currentSeason, currentRegistration } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [courseList, setCourseList] = useState<any[]>([]);

  /* subject label header list */
  const [subjectLabelHeaderList, setSubjectLabelHeaderList] = useState<any[]>(
    []
  );

  const [viewPopupActive, setViewPopupActive] = useState<boolean>(false);
  const [course, setCourse] = useState<string>();
  const [courseData, setCourseData] = useState<any>();
  const [confirmStatusPopupActive, setConfirmStatusPopupActive] =
    useState<boolean>(false);

  async function getCreatedCourseList() {
    const { syllabuses, enrollments } = await SyllabusApi.RSyllabuses({
      season: currentRegistration?.season,
    });
    if (syllabuses.length === 0) return [];

    const count = _.countBy(
      enrollments.map((enrollment: any) => enrollment.syllabus)
    );

    for (let syllabus of syllabuses) {
      syllabus.count_limit = `${count[syllabus._id] || 0}/${syllabus.limit}`;
    }

    return syllabuses;
  }

  const structuring = (courseList: any[]) => {
    return _.sortBy(
      courseList.map((syllabus: any) => {
        for (let idx = 0; idx < currentSeason?.subjects?.label.length; idx++) {
          syllabus[currentSeason?.subjects?.label[idx]] = syllabus.subject[idx];
        }
        syllabus.timeText = _.join(
          syllabus.time.map((timeBlock: any) => timeBlock.label),
          ", "
        );
        syllabus.mentorText = _.join(
          syllabus.teachers.map((teacher: any) => teacher.userName),
          ", "
        );
        syllabus.confirmed = true;
        for (let teacher of syllabus.teachers) {
          if (!teacher.confirmed) {
            syllabus.confirmed = false;
            break;
          }
        }

        const confirmedCnt = _.filter(syllabus.teachers, {
          confirmed: true,
        }).length;
        syllabus.confirmedStatus =
          confirmedCnt === 0
            ? "notConfirmed"
            : confirmedCnt === syllabus.teachers.length
            ? "fullyConfirmed"
            : "semiConfirmed";

        return syllabus;
      }),
      ["subject", "classTitle"]
    );
  };

  const subjectHeaderList = [
    {
      text: "수업명",
      key: "classTitle",
      type: "text",
      textAlign: "center",
      wordBreak: "keep-all",
      width: "320px",
    },

    {
      text: "시간",
      key: "timeText",
      type: "string",
      textAlign: "center",
      wordBreak: "keep-all",
      width: "120px",
    },
    {
      text: "강의실",
      key: "classroom",
      type: "string",
      textAlign: "center",
      whiteSpace: "pre",
      width: "80px",
    },

    {
      text: "학점",
      key: "point",
      type: "string",
      textAlign: "center",
      whiteSpace: "pre",
      width: "60px",
    },
    {
      text: "수강/정원",
      key: "count_limit",
      type: "string",
      textAlign: "center",
      whiteSpace: "pre",
      width: "80px",
    },
    {
      text: "개설자",
      key: "userName",
      type: "string",
      textAlign: "center",
      wordBreak: "keep-all",
      width: "80px",
    },
    {
      text: "멘토",
      key: "mentorText",
      type: "string",
      textAlign: "center",
      wordBreak: "keep-all",
      width: "80px",
    },
    {
      text: "상태",
      key: "confirmedStatus",
      width: "72px",
      textAlign: "center",
      type: "status",
      status: {
        notConfirmed: {
          text: "미승인",
          color: "red",
        },
        fullyConfirmed: {
          text: "승인됨",
          color: "green",
        },
        semiConfirmed: {
          text: "승인중",
          color: "purple",
          onClick: (e: any) => {
            setCourseData(courseList[e.tableRowIndex - 1]);
            setConfirmStatusPopupActive(true);
          },
        },
      },
    },
    {
      text: "자세히",
      key: "detail",
      type: "button",
      onClick: (e: any) => {
        setCourse(e._id);
        setViewPopupActive(true);
      },
      width: "72px",
      textAlign: "center",
      btnStyle: {
        border: true,
        color: "black",
        padding: "4px",
        round: true,
      },
    },
  ];

  useEffect(() => {
    if (isLoading) {
      if (!currentRegistration) {
        alert("등록된 학기가 없습니다.");
        navigate("/");
      } else {
        getCreatedCourseList().then((res: any) => {
          setCourseList(structuring(res));

          if (currentSeason?.subjects?.label) {
            setSubjectLabelHeaderList([
              ...currentSeason?.subjects?.label.map((label: string) => {
                return {
                  text: label,
                  key: label,
                  type: "text",
                  textAlign: "center",
                  wordBreak: "keep-all",
                  width: "80px",
                };
              }),
            ]);
          }

          setIsLoading(false);
        });
      }
    }
  }, [isLoading]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>수업 목록</div>
        <div style={{ height: "24px" }}></div>
        {!isLoading ? (
          <Table
            control
            defaultPageBy={50}
            type="object-array"
            data={courseList}
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
                whiteSpace: "pre",
              },
              ...subjectLabelHeaderList,
              ...subjectHeaderList,
            ]}
          />
        ) : (
          <Loading height={"calc(100vh - 55px)"} />
        )}
      </div>
      {viewPopupActive && course && (
        <ViewPopup course={course} setPopupActive={setViewPopupActive} />
      )}
      {confirmStatusPopupActive && (
        <Popup
          setState={setConfirmStatusPopupActive}
          title="승인 상태"
          closeBtn
        >
          <Table
            type="object-array"
            data={courseData?.teachers || []}
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
                  false: {
                    text: "미승인",
                    color: "red",
                  },
                  true: {
                    text: "승인됨",
                    color: "green",
                  },
                },
              },
            ]}
          />
        </Popup>
      )}
    </>
  );
};

export default Courses;
