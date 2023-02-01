/**
 * @file Courses Pid Page
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
import { useNavigate, useParams } from "react-router-dom";
import useApi from "hooks/useApi";
import { useAuth } from "contexts/authContext";
import style from "style/pages/courses/course.module.scss";

import Navbar from "layout/navbar/Navbar";

import _ from "lodash";
import useDatabase from "hooks/useDatabase";
import EditorParser from "editor/EditorParser";
import Divider from "components/divider/Divider";
import Button from "components/button/Button";

import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import Loading from "components/loading/Loading";

type Props = {};

const CoursePid = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { SyllabusApi } = useApi();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [courseData, setCourseData] = useState<any>();

  const navigate = useNavigate();
  const { currentSeason, currentUser } = useAuth();
  const database = useDatabase();

  const [confirmStatusPopupActive, setConfirmStatusPopupActive] =
    useState<boolean>(false);

  const [confirmed, setConfirmed] = useState<boolean>(true);

  const categories = () => {
    return (
      <>
        {currentSeason?.subjects?.label && (
          <div className={style.category}>
            {_.join(currentSeason?.subjects.label, "/")}:{" "}
            {_.join(courseData.subject, "/")}
          </div>
        )}
        <div className={style.category}>
          강의실: {courseData.classroom || "없음"}
        </div>
        <div className={style.category}>
          시간:{" "}
          {_.join(
            courseData?.time.map((timeBlock: any) => timeBlock.label),
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
          상태: {confirmed ? "승인됨" : "미승인"}
        </div>
      </>
    );
  };

  async function deleteCourse() {
    if (window.confirm("정말 삭제하시겠습니까?") === true) {
      const result = database.D({
        location: `syllabuses/${courseData._id}`,
      });
      return result;
    } else {
      return false;
    }
  }

  useEffect(() => {
    if (isLoading) {
      SyllabusApi.RSyllabus(pid)
        .then((result) => {
          setCourseData(result);

          if (
            result.season !== currentSeason._id ||
            result.userId !== currentUser.userId
          ) {
            navigate("/courses#개설%20수업", { replace: true });
          }

          // is this syllabus fully confirmed?
          for (let teacher of result.teachers) {
            if (!teacher.confirmed) {
              setConfirmed(false);
              break;
            }
          }

          setIsLoading(false);
        })
        .catch((err) => {
          alert(err.response.data.message);
          navigate("/courses");
        });
    }
    return () => {};
  }, [isLoading]);

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

  return !isLoading ? (
    <>
      <Navbar />
      <div className={style.section}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 500,
            marginBottom: "18px",
            display: "flex",
            color: "var(--accent-1)",
          }}
        >
          <div style={{ wordBreak: "keep-all" }}>
            <span>&nbsp;/&nbsp;</span>
            <span
              style={{ cursor: "pointer" }}
              onClick={() => {
                navigate("/courses#개설%20수업", { replace: true });
              }}
            >
              {`개설한 수업 목록 / ${pid}`}
            </span>
          </div>
        </div>
        <>
          <div className={style.title}>{courseData.classTitle}</div>
          <div className={style.categories_container}>
            <div className={style.categories}>{categories()}</div>
          </div>
          <Divider />
          <ClassInfo />
          <div style={{ height: "24px" }}></div>
          <Divider />

          {!confirmed && (
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
                  navigate(`/courses/edit/${pid}`, { replace: true });
                }}
              >
                수정
              </Button>
              <Button
                type={"ghost"}
                style={{
                  borderRadius: "4px",
                  height: "32px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                  marginTop: "12px",
                }}
                onClick={() => {
                  deleteCourse()
                    .then((res) => {
                      alert("success");
                      navigate("/courses");
                    })
                    .catch((err) => {
                      alert(err.response.body.message);
                    });
                }}
              >
                삭제
              </Button>
            </>
          )}
          <div style={{ height: "24px" }}></div>

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
        </>
      </div>
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default CoursePid;
