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
import useApi from "hooks/useApi";
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
import Svg from "assets/svg/Svg";

type Props = {};

const CoursePid = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { currentSeason, currentUser } = useAuth();
  const { SyllabusApi, EnrollmentApi } = useApi();
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
          멘토:{" "}
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
    if (isLoading) {
      SyllabusApi.RSyllabus(pid)
        .then((result) => {
          setSyllabus(result);

          if (result.season !== currentSeason._id) {
            navigate("/courses#개설%20수업", { replace: true });
          }

          if (result.user !== currentUser._id) {
            if (_.find(result.teachers, { _id: currentUser._id })) {
              navigate("/courses/mentoring/" + result._id, { replace: true });
            } else {
              navigate("/courses#개설%20수업", { replace: true });
            }
          }

          // is this syllabus fully confirmed?
          let confirmedCnt = 0;
          for (let teacher of result?.teachers) {
            if (teacher.confirmed) {
              confirmedCnt += 1;
            }
          }
          setConfirmedStatus(
            confirmedCnt === 0
              ? "notConfirmed"
              : confirmedCnt === result?.teachers.length
              ? "fullyConfirmed"
              : "semiConfirmed"
          );
        })
        .then(() => {
          setIsLoading(false);
        })
        .catch((err) => {
          alert(err.response.data.message);
          navigate("/courses");
        });
    }
    return () => {};
  }, [isLoading]);

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
          {_.find(syllabus.teachers, { _id: currentUser._id }) && (
            <div
              className={style.icon}
              onClick={(e: any) => {
                navigate(`/courses/mentoring/${syllabus._id}`, {
                  replace: true,
                });
              }}
              style={{ display: "flex", gap: "4px", alignItems: "center" }}
              title="멘토링 페이지로 이동"
            >
              <Svg type="linkExternal" width="16px" height="16px" />
            </div>
          )}
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
                SyllabusApi.DSyllabus(syllabus._id)
                  .then(() => {
                    alert(SUCCESS_MESSAGE);
                    navigate("/courses#개설%20수업");
                  })
                  .catch((err) => {
                    alert(
                      err?.response?.data?.message ?? "에러가 발생했습니다."
                    );
                  });
              } else {
                return false;
              }
            }}
          >
            삭제
          </Button>
        </>

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
                    onClick: (e: any) => {
                      if (e._id === currentUser._id) {
                        SyllabusApi.ConfirmSyllabus(syllabus?._id)
                          .then(() => {
                            alert(SUCCESS_MESSAGE);
                            setIsLoading(true);
                          })
                          .catch((err) => {
                            alert("failed to confirm");
                          });
                      }
                    },
                  },
                  true: {
                    text: "승인됨",
                    color: "green",
                    onClick: (e: any) => {
                      if (e._id === currentUser._id) {
                        EnrollmentApi.REnrolllments({
                          syllabus: syllabus._id,
                        }).then((enrollments: any[]) => {
                          if (enrollments.length !== 0) {
                            alert(
                              "수강신청한 학생이 있으면 승인을 취소할 수 없습니다."
                            );
                          } else {
                            SyllabusApi.UnconfirmSyllabus(syllabus?._id)
                              .then((res) => {
                                alert(SUCCESS_MESSAGE);
                                setIsLoading(true);
                              })
                              .catch((err) => {
                                alert("failed to unconfirm");
                              });
                          }
                        });
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
