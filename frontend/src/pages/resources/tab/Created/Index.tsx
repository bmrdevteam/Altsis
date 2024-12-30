/**
 * @file Created Course View
 * @page 개설 수업 상세페이지
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
import { useAuth } from "contexts/authContext";
import style from "style/pages/courses/course.module.scss";

import Navbar from "layout/navbar/Navbar";

import _ from "lodash";
import EditorParser from "editor/EditorParser";
import Divider from "components/divider/Divider";
import Button from "components/button/Button";

import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import Loading from "components/loading/Loading";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {};

const CoursePid = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { currentSeason, currentUser, currentRegistration } = useAuth();
  const { SyllabusAPI } = useAPIv2();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syllabus, setSyllabus] = useState<any>();

  const [confirmStatusPopupActive, setConfirmStatusPopupActive] =
    useState<boolean>(false);
  const [confirmedStatus, setConfirmedStatus] =
    useState<string>("notConfirmed");

  const categories = () => {
    return (
      <>
        {currentSeason?.subjects?.label && (
          <div className={style.category}>
            {_.join(currentSeason?.subjects.label, "/")}:{" "}
            {_.join(syllabus.subject, "/")}
          </div>
        )}
        <div className={style.category}>
          강의실: {syllabus.classroom || "없음"}
        </div>
        <div className={style.category}>
          시간:{" "}
          {_.join(
            syllabus?.time.map((timeBlock: any) => timeBlock.label),
            ", "
          )}
        </div>
        <div className={style.category}>학점: {syllabus.point}</div>
        <div className={style.category}>수강정원: {syllabus.limit}</div>
        <div className={style.category}>개설자: {syllabus.userName}</div>
        <div className={style.category}>
        지도교사:{" "}
          {_.join(
            syllabus.teachers?.map((teacher: any) => teacher.userName),
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

  useEffect(() => {
    if (isLoading && pid && currentUser?._id && currentSeason?._id) {
      SyllabusAPI.RSyllabus({ params: { _id: pid } })
        .then(({ syllabus }) => {
          setSyllabus(syllabus);

          if (syllabus.season !== currentSeason._id) {
            navigate("/courses#개설%20수업", { replace: true });
          }
          if (_.find(syllabus.teachers, { _id: currentUser._id })) {
            navigate("/courses/mentoring/" + syllabus._id, { replace: true });
          }
          if (syllabus.user !== currentUser._id) {
            navigate("/courses#개설%20수업", { replace: true });
          }

          // is this syllabus fully confirmed?
          let confirmedCnt = 0;
          for (let teacher of syllabus?.teachers) {
            if (teacher.confirmed) {
              confirmedCnt += 1;
            }
          }
          setConfirmedStatus(
            confirmedCnt === 0
              ? "notConfirmed"
              : confirmedCnt === syllabus?.teachers.length
              ? "fullyConfirmed"
              : "semiConfirmed"
          );
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
  }, [isLoading, pid, currentUser, currentSeason]);

  return !isLoading ? (
    <>
      <Navbar />
      <div className={style.section}>
        <div
          className="syllabus-header"
          style={{
            fontSize: "12px",
            fontWeight: 500,
            marginBottom: "18px",
            display: "flex",
            color: "var(--accent-1)",
            justifyContent: "space-between",
          }}
        >
          <div style={{ wordBreak: "keep-all" }} title="목록으로 이동">
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

        <div className={style.title}>{syllabus.classTitle}</div>
        <div className={style.categories_container}>
          <div className={style.categories}>{categories()}</div>
        </div>
        <Divider />
        <EditorParser
          type="syllabus"
          auth="view"
          defaultValues={syllabus.info}
          data={currentSeason?.formSyllabus}
        />
        <div style={{ height: "24px" }}></div>
        <Divider />

        {currentRegistration?.permissionSyllabusV2 && (
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
              disabled={confirmedStatus !== "notConfirmed"}
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
                if (window.confirm("정말 삭제하시겠습니까?") === true) {
                  SyllabusAPI.DSyllabus({ params: { _id: syllabus._id } })
                    .then(() => {
                      alert(SUCCESS_MESSAGE);
                      navigate("/courses#개설%20수업");
                    })
                    .catch((err) => {
                      ALERT_ERROR(err);
                    });
                } else {
                  return false;
                }
              }}
            >
              삭제
            </Button>
          </>
        )}

        <div style={{ height: "24px" }}></div>
      </div>
      {confirmStatusPopupActive && (
        <Popup
          setState={setConfirmStatusPopupActive}
          title="승인 상태"
          closeBtn
        >
          <Table
            type="object-array"
            data={syllabus.teachers}
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
              },
              {
                text: "지도교사 ID",
                key: "userId",
                type: "text",
                textAlign: "center",
              },
              {
                text: "지도교사 이름",
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
                    onClick: (e: any) => {
                      if (e._id === currentUser._id) {
                        SyllabusAPI.UConfirmSyllabus({
                          params: { _id: syllabus?._id },
                        })
                          .then(() => {
                            alert(SUCCESS_MESSAGE);
                            setIsLoading(true);
                          })
                          .catch((err) => {
                            ALERT_ERROR(err);
                          });
                      }
                    },
                  },
                  true: {
                    text: "승인됨",
                    color: "green",
                    onClick: (e: any) => {
                      if (e._id === currentUser._id) {
                        if (syllabus?.count !== 0) {
                          alert(
                            "수강신청한 학생이 있으면 승인을 취소할 수 없습니다."
                          );
                        } else {
                          SyllabusAPI.UCancleConfirmSyllabus({
                            params: { _id: syllabus?._id },
                          })
                            .then((res) => {
                              alert(SUCCESS_MESSAGE);
                              setIsLoading(true);
                            })
                            .catch((err) => {
                              ALERT_ERROR(err);
                            });
                        }
                      }
                    },
                  },
                },
              },
            ]}
          />
        </Popup>
      )}
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default CoursePid;
