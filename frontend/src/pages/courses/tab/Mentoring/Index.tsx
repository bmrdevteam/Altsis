/**
 * @file Mentoring Course View
 * @page 멘토링 수업 상세페이지
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
import { useParams } from "react-router-dom";
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";
import style from "style/pages/courses/course.module.scss";

import _ from "lodash";
import EditorParser from "editor/EditorParser";
import Divider from "components/divider/Divider";
import Button from "components/button/Button";

import MentoringTable from "pages/courses/table/MentoringTable";
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import Loading from "components/loading/Loading";
import Svg from "assets/svg/Svg";

import EnrollBulkPopup from "./EnrollBulkPopup";
import Send from "../../../notifications/popup/Send";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Progress from "components/progress/Progress";
import CourseMetaInfo, { ConfirmedStatus } from "pages/courses/view/CourseMetaInfo";
import CourseCoverImage from "pages/courses/view/CourseCoverImage";

type Props = {};

const CoursePid = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { currentSeason, currentUser, currentRegistration } = useAuth();
  const { SeasonAPI, SyllabusAPI, EnrollmentAPI } = useAPIv2();
  const navigate = useAppNavigate();

  const [isLoadingSyllabus, setIsLoadingSyllabus] = useState<boolean>(false);
  const [syllabus, setSyllabus] = useState<any>();

  const [confirmedStatus, setConfirmedStatus] =
    useState<ConfirmedStatus>("notConfirmed");
  const [confirmStatusPopupActive, setConfirmStatusPopupActive] =
    useState<boolean>(false);

  const [isEnrollmentsLoading, setIsEnrollmentsLoading] =
    useState<boolean>(false);
  const [enrollmentList, setEnrollmentList] = useState<any[]>([]);
  const enrollmentListRef = useRef<any[]>([]);
  const [isChecked, setIsChecked] = useState<boolean>(false);

  const [enrollBulkPopupActive, setEnrollBulkPopupActive] =
    useState<boolean>(false);
  const [sendNotificationPopupActive, setSendNotificationPopupActive] =
    useState<boolean>(false);

  const [formEvaluationHeader, setFormEvaluationHeader] = useState<any[]>([]);
  const [fieldEvaluationList, setFieldEvaluationList] = useState<any[]>([]);

  const [statusPopupActive, setStatusPopupActive] = useState<boolean>(false);
  const [ratio, setRatio] = useState<number>(0);

  const evaluationAction = (e: any) => {
      const evaluation: any = {};
      for (let obj of fieldEvaluationList) {
        evaluation[obj.text] = e[obj.key];
      }
      EnrollmentAPI.UEvaluation({
        params: {
          _id: e._id,
        },
        data: { evaluation },
      })
        .then(() => {
          // alert(SUCCESS_MESSAGE); 메세지 출력 제거 24.02.04 devgoodway
          if (enrollmentListRef.current.length !== 0) {
            enrollmentListRef.current[e.tableRowIndex - 1].isModified =
              false;
            setEnrollmentList([...enrollmentListRef.current]);
          }
        })
        .catch((err: any) => {
          ALERT_ERROR(err);
        });
    }

  const metaItems = () => {
    const items = [];
    if (currentSeason?.subjects?.label) {
      items.push({
        label: _.join(currentSeason.subjects.label, "/"),
        value: _.join(syllabus.subject, "/"),
      });
    }
    items.push(
      { label: "강의실", value: syllabus.classroom || "없음" },
      {
        label: "시간",
        value: _.join(
          syllabus?.time.map((timeBlock: any) => timeBlock.label),
          ", "
        ),
      },
      { label: "학점", value: String(syllabus.point) },
      {
        label: "수강/정원",
        value: `${enrollmentList.length}/${syllabus.limit}`,
      },
      { label: "개설자", value: syllabus.userName },
      {
        label: "멘토",
        value: _.join(
          syllabus.teachers?.map((teacher: any) => teacher.userName),
          ", "
        ),
      }
    );
    return items;
  };

  const onClickRemoveHandler = async (e: any) => {
    const enrollmentsToRemove = _.filter(enrollmentListRef.current, {
      tableRowChecked: true,
    });

    if (enrollmentsToRemove.length === 0) return;
    setRatio(0);
    setStatusPopupActive(true);

    for (let i = 0; i < enrollmentsToRemove.length; i++) {
      try {
        await EnrollmentAPI.DEnrollment({
          params: {
            _id: enrollmentsToRemove[i]._id,
          },
        });
      } catch (err) {
      } finally {
        setRatio((i + 1) / enrollmentsToRemove.length);
      }
    }
  };

  useEffect(() => {
    if (
      currentUser?._id &&
      currentSeason?.formEvaluation &&
      currentRegistration
    ) {
      setIsLoadingSyllabus(true);
    }
    return () => {};
  }, [currentUser, currentSeason, currentRegistration]);

  useEffect(() => {
    if (isLoadingSyllabus && pid) {
      SyllabusAPI.RSyllabus({ params: { _id: pid } })
        .then(({ syllabus }) => {
          if (syllabus.season !== currentSeason?._id) {
            navigate("/courses#담당%20수업", { replace: true });
          }

          setSyllabus(syllabus);

          // is this syllabus fully confirmed?
          // Is this user is mentor of this syllabus?
          let confirmedCnt = 0;
          let isMentor = false;
          for (let teacher of syllabus?.teachers) {
            if (teacher.confirmed) {
              confirmedCnt += 1;
            }
            if (teacher.userId === currentUser?.userId || currentUser.auth === "manager") {
              isMentor = true;
            }
          }
          setConfirmedStatus(
            confirmedCnt === 0
              ? "notConfirmed"
              : confirmedCnt === syllabus?.teachers.length
              ? "fullyConfirmed"
              : "semiConfirmed"
          );
          if (!isMentor) {
            navigate("/courses#담당%20수업", { replace: true });
          }

          SeasonAPI.RSeason({ params: { _id: syllabus.season } }).then(
            ({ season }) => {
              let _formEvaluationHeader: any[] = [];

              if (currentRegistration?.permissionEvaluationV2) {
                season.formEvaluation.forEach((val: any) => {
                  const text = val.label;
                  const key = "evaluation." + text;

                  if (val.auth.edit.teacher) {
                    fieldEvaluationList.push({
                      text,
                      key,
                    });
                    if (val.type === "input-number") {
                      _formEvaluationHeader.push({
                        text,
                        key,
                        type: "input-number",
                      });
                    } else if (val.type === "select") {
                      _formEvaluationHeader.push({
                        text,
                        key,
                        type: "select",
                        option: val.options,
                      });
                    } else {
                      _formEvaluationHeader.push({
                        text,
                        key,
                        type: "input",
                      });
                    }
                  } else if (val.auth.view.student) {
                    _formEvaluationHeader.push({
                      text,
                      key,
                      type: "text",
                      whiteSpace: "pre-wrap",
                    });
                  }
                });
              } else {
                season.formEvaluation.forEach((val: any) => {
                  _formEvaluationHeader.push({
                    text: val.label,
                    key: "evaluation." + val.label,
                    type: "text",
                    whiteSpace: "pre-wrap",
                  });
                });
              }
              setFieldEvaluationList(fieldEvaluationList);
              setFormEvaluationHeader(_formEvaluationHeader);
            }
          );
        })
        .then(() => {
          setIsLoadingSyllabus(false);
          setIsEnrollmentsLoading(true);
        })
        .catch((err) => {
          ALERT_ERROR(err);
          navigate("/courses");
        });
    }
    return () => {};
  }, [isLoadingSyllabus]);

  useEffect(() => {
    if (isEnrollmentsLoading) {
      EnrollmentAPI.REnrollmentsWithEvaluation({
        query: { syllabus: pid },
      }).then(({ enrollments }: any) => {
        setEnrollmentList(
          enrollments.map((enrollment: any) => {
            return { ...enrollment, isModified: false };
          })
        );
        enrollmentListRef.current = [];

        setIsEnrollmentsLoading(false);
      });
    }
    return () => {};
  }, [isEnrollmentsLoading]);

  const studentsHeader = () => {
    const header = [];
    if (currentRegistration?.permissionEnrollmentV2) {
      header.push({
        text: "checkbox",
        key: "checkbox",
        type: "checkbox",
        width: "48px",
      });
    }
    header.push(
      ...[
        {
          text: "학년",
          key: "studentGrade",
          type: "text",
          textAlign: "center",
          whiteSpace: "pre",
        },

        {
          text: "이름",
          key: "studentName",
          type: "text",
          textAlign: "center",
          whiteSpace: "pre",
        },
        {
          text: "ID",
          key: "studentId",
          type: "text",
          textAlign: "center",
          whiteSpace: "pre",
        },
      ]
    );
    header.push(...formEvaluationHeader);
    if (currentRegistration?.permissionEvaluationV2) {
      header.push({
        text: "저장",
        key: "isModified",
        width: "72px",
        textAlign: "center",
        type: "status",
        status: {
          false: { text: "저장", color: "gray" },
          true: {
            text: "저장",
            color: "red",
            onClick: evaluationAction,
          },
        },
      });
    }

    return header;
  };

  return (
    <>
      <div className={style.section}>
        {!isLoadingSyllabus && syllabus?._id ? (
          <div className={"syllabus-enrollments-wrapper"}>
            <div className={"syllabus"}>
              <div className={style.course_header}>
                <CourseCoverImage
                  coverImage={syllabus.coverImage}
                  coverColor={syllabus.coverColor}
                  classTitle={syllabus.classTitle}
                  syllabusId={syllabus._id}
                />
                <div className={style.course_header_info}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className={style.title}>{syllabus.classTitle}</div>
                    <div
                      className={`btn ${style.print_btn}`}
                      onClick={() => {
                        window.print();
                      }}
                      title="인쇄"
                    >
                      <Svg type={"print"} />
                    </div>
                  </div>
                  <div className={style.meta_section}>
                    <CourseMetaInfo
                      items={metaItems()}
                      confirmedStatus={confirmedStatus}
                      onStatusClick={() => setConfirmStatusPopupActive(true)}
                    />
                  </div>
                </div>
              </div>
              <Divider />
              <EditorParser
                type="syllabus"
                auth="view"
                defaultValues={syllabus.info}
                data={currentSeason?.formSyllabus}
              />
              <div className={style.no_print}>
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
                        navigate(
                          `/courses/edit/${pid}?byMentor=true${
                            enrollmentList.length > 0 ? "&strictMode=true" : ""
                          }`,
                          { replace: true }
                        );
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
                        if (
                          window.confirm(
                            `정말 삭제하시겠습니까?${
                              enrollmentList.length > 0
                                ? " 평가도 함께 삭제됩니다."
                                : ""
                            }`
                          ) === true
                        ) {
                          SyllabusAPI.DSyllabus({ params: { _id: syllabus._id } })
                            .then(() => {
                              alert(SUCCESS_MESSAGE);
                              navigate("/courses#담당%20수업");
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
              </div>
            </div>
            <div style={{ marginTop: "24px" }} className={"enrollments"}>
              <div style={{ display: "flex" }}>
                <div
                  style={{
                    flex: "auto",
                    marginLeft: "12px",
                    display: "flex",
                    gap: "12px",
                  }}
                >
                  <div className={style.title}>수강생 목록 및 평가</div>
                </div>
                <div
                  style={{
                    flex: "auto",
                    marginRight: "24px",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  {!isChecked ? (
                    <div
                      className={style.icon}
                      onClick={(e: any) => {
                        if (confirmedStatus !== "fullyConfirmed") {
                          alert(
                            "수업이 승인되지 않아 학생을 초대할 수 없습니다."
                          );
                        } else if (
                          !currentRegistration?.permissionEnrollmentV2
                        ) {
                          alert("수업 초대 권한이 없습니다.");
                        } else {
                          setEnrollBulkPopupActive(true);
                        }
                      }}
                      style={{
                        display: "flex",
                        gap: "4px",
                        alignItems: "center",
                      }}
                    >
                      <Svg type="user_check" width="24px" height="24px" />
                      초대
                    </div>
                  ) : (
                    <>
                      <div
                        className={style.icon}
                        onClick={onClickRemoveHandler}
                        style={{
                          display: "flex",
                          gap: "4px",
                          alignItems: "center",
                        }}
                      >
                        <Svg type="user_check" width="24px" height="24px" />
                        초대 취소
                      </div>
                      <div
                        className={style.icon}
                        onClick={(e: any) => {
                          setSendNotificationPopupActive(true);
                        }}
                        style={{ display: "flex", gap: "4px" }}
                      >
                        <Svg type="send" width="20px" height="20px" />
                        알림
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <MentoringTable
                type="object-array"
                data={!isEnrollmentsLoading ? enrollmentList : []}
                // 평가 자동 저장 기능 추가 24.02.04 devgoodway
                onBlur={(e: any) => {
                  for (let item of e) {
                    if(item.isModified === true){                  
                      const evaluation: any = {};
                      for (let obj of fieldEvaluationList) {
                        evaluation[obj.text] = item[obj.key];
                      }
                      EnrollmentAPI.UEvaluation({
                        params: {
                          _id: item._id,
                        },
                        data: { evaluation },
                      })
                        .then(() => {
                          if (enrollmentListRef.current.length !== 0) {
                            enrollmentListRef.current[item.tableRowIndex - 1].isModified =
                              false;
                            setEnrollmentList([...enrollmentListRef.current]);
                          }
                        })
                        .catch((err: any) => {
                          ALERT_ERROR(err);
                        });}
                      }
                    }
                  }
                onChange={(e: any) => {
                  setTimeout(() => {
                    enrollmentListRef.current = e;
                    setIsChecked(
                      _.find(e, {
                        tableRowChecked: true,
                      })
                    );
                  }, 50);
                }}
                header={studentsHeader()}
              />
            </div>
          </div>
        ) : (
          <Loading height={"calc(100vh - 55px)"} />
        )}
      </div>
      {confirmStatusPopupActive && (
        <Popup
          setState={setConfirmStatusPopupActive}
          title="승인 상태"
          closeBtn
        >
          <MentoringTable
            type="object-array"
            data={syllabus?.teachers}
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
                whiteSpace: "pre",
              },
              {
                text: "멘토 ID",
                key: "userId",
                type: "text",
                textAlign: "center",
                whiteSpace: "pre",
              },
              {
                text: "멘토 이름",
                key: "userName",
                type: "text",
                textAlign: "center",
                whiteSpace: "pre",
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
                            setIsLoadingSyllabus(true);
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
                        if (syllabus?.count !== 0)
                          alert(
                            "수강신청한 학생이 있으면 승인을 취소할 수 없습니다."
                          );
                        else {
                          SyllabusAPI.UCancleConfirmSyllabus({
                            params: { _id: syllabus?._id },
                          })
                            .then((res) => {
                              alert(SUCCESS_MESSAGE);
                              setIsLoadingSyllabus(true);
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
      {sendNotificationPopupActive && (
        <Send
          setState={setSendNotificationPopupActive}
          receiverSelectedList={_.filter(enrollmentListRef.current, {
            tableRowChecked: true,
          }).map((e: any) => {
            return {
              user: e.student,
              userId: e.studentId,
              userName: e.studentName,
            };
          })}
          category={syllabus?.classTitle}
          receiverList={enrollmentListRef.current.map((e) => {
            return {
              user: e.student,
              userId: e.studentId,
              userName: e.studentName,
            };
          })}
          receiverType={"enrollment"}
        />
      )}
      {enrollBulkPopupActive && (
        <EnrollBulkPopup
          setPopupActive={setEnrollBulkPopupActive}
          courseData={syllabus}
          setIsEnrollmentListLoading={setIsEnrollmentsLoading}
        />
      )}
      {statusPopupActive && (
        <Popup
          setState={() => {}}
          style={{ maxWidth: "640px", width: "100%" }}
          title="초대 취소"
          contentScroll
        >
          <div>
            <Progress value={ratio} style={{ margin: "12px 0px" }} />
            {ratio === 1 && (
              <div>
                <Button
                  type={"ghost"}
                  onClick={() => {
                    setStatusPopupActive(false);
                    setIsEnrollmentsLoading(true);
                  }}
                  style={{
                    borderRadius: "4px",
                    height: "32px",
                    boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                    marginTop: "24px",
                  }}
                >
                  확인
                </Button>
              </div>
            )}
          </div>
        </Popup>
      )}
    </>
  );
};

export default CoursePid;
