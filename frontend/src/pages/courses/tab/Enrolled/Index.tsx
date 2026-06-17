/**
 * @file Enrolled Course View
 * @page 수강 수업 상세페이지
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
import { useParams } from "react-router-dom";
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";
// tab pages
import style from "style/pages/courses/course.module.scss";

// components
import Divider from "components/divider/Divider";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";
import Tab from "components/tab/Tab";

import EditorParser from "editor/EditorParser";
import AltBoardTab from "pages/courses/tab/Mentoring/AltBoardTab";
import EnrolledActivityTab from "./ActivityTab";

import _ from "lodash";

import Loading from "components/loading/Loading";
import Svg from "assets/svg/Svg";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import CourseMetaInfo, { ConfirmedStatus } from "pages/courses/view/CourseMetaInfo";
import CourseCoverImage from "pages/courses/view/CourseCoverImage";

type Props = {};

const CourseEnrollment = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { currentUser, currentRegistration, currentSeason, currentSchool } = useAuth();
  const navigate = useAppNavigate();
  const { EnrollmentAPI, SyllabusAPI } = useAPIv2();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingEvaluation, setIsLoadingEvaluation] =
    useState<boolean>(false);

  const [enrollmentData, setEnrollmentData] = useState<any>();
  const [syllabusData, setSyllabusData] = useState<any>();

  const [courseData, setCourseData] = useState<any>();
  const [confirmedStatus, setConfirmedStatus] =
    useState<ConfirmedStatus>("notConfirmed");
  const [confirmStatusPopupActive, setConfirmStatusPopupActive] =
    useState<boolean>(false);

  const [formEvaluationHeader, setFormEvaluationHeader] = useState<any[]>([]);
  const [fieldEvaluationList, setFieldEvaluationList] = useState<any[]>([]);

  const [enrollments, setEnrollments] = useState<any[]>();

  const metaItems = () => {
    const items = [];
    if (currentSeason?.subjects?.label) {
      items.push({
        label: _.join(currentSeason.subjects.label, "/"),
        value: _.join(enrollmentData?.subject, "/"),
      });
    }
    items.push(
      { label: "강의실", value: enrollmentData?.classroom || "없음" },
      {
        label: "시간",
        value: _.join(
          enrollmentData?.time?.map((timeBlock: any) => timeBlock.label),
          ", "
        ),
      },
      { label: "학점", value: String(enrollmentData?.point) },
      { label: "수강정원", value: String(enrollmentData?.limit) },
      { label: "개설자", value: enrollmentData?.userName },
      {
        label: "교사",
        value: _.join(
          enrollmentData?.teachers?.map((teacher: any) => teacher.userName),
          ", "
        ),
      }
    );
    return items;
  };

  const ClassInfo = () => {
    return (
      <EditorParser
        type="syllabus"
        auth="view"
        defaultValues={syllabusData?.info || courseData?.info}
        data={currentSeason?.formSyllabus}
      />
    );
  };

  useEffect(() => {
    if (
      currentUser?._id &&
      currentRegistration?._id &&
      currentSeason?.formEvaluation
    ) {
      setIsLoading(true);
    }
    return () => {};
  }, [currentUser, currentRegistration, currentSeason]);

  useEffect(() => {
    if (isLoading && pid) {
      EnrollmentAPI.REnrollment({ params: { _id: pid } })
        .then(({ enrollment }) => {
          if (enrollment.season !== currentSeason._id) {
            navigate("/courses#수강신청%20현황", { replace: true });
          }

          if (_.find(enrollment.teachers, { _id: currentUser._id })) {
            if (
              window.confirm(
                "담당 중인 수업입니다. 멘토링 페이지로 이동하시겠습니까?"
              )
            ) {
              navigate(`../mentoring/${enrollment.syllabus}`, {
                replace: true,
              });
            }
          }

          if (enrollment.student !== currentUser._id) {
            navigate("/courses", { replace: true });
          }

          setCourseData(enrollment);
          setEnrollmentData(enrollment);

          // 최신 강의계획서 데이터 조회 (커버 이미지, info 등 동기화)
          SyllabusAPI.RSyllabus({ params: { _id: enrollment.syllabus } })
            .then(({ syllabus }) => {
              setSyllabusData(syllabus);
            })
            .catch(() => {});

          let _formEvaluationHeader: any[] = [];
          if (currentRegistration?.permissionEvaluationV2) {
            currentSeason.formEvaluation.forEach((val: any) => {
              const text = val.label;
              const key = "evaluation." + text;

              if (val.auth.edit.student) {
                fieldEvaluationList.push({
                  text,
                  key,
                });
                _formEvaluationHeader.push({
                  text,
                  key,
                  type: val.type ?? "input",
                });
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
            currentSeason.formEvaluation.forEach((val: any) => {
              if (val.auth.edit.student || val.auth.view.student)
                _formEvaluationHeader.push({
                  text: val.label,
                  key: "evaluation." + val.label,
                  type: "text",
                  whiteSpace: "pre-wrap",
                });
            });
          }
          setFieldEvaluationList([...fieldEvaluationList]);
          setFormEvaluationHeader(_formEvaluationHeader);
          setIsLoading(false);

          // is this syllabus fully confirmed?
          let confirmedCnt = 0;
          for (let teacher of enrollment.teachers) {
            if (teacher.confirmed) {
              confirmedCnt++;
            }
          }
          setConfirmedStatus(
            confirmedCnt === 0
              ? "notConfirmed"
              : confirmedCnt === enrollment.teachers.length
              ? "fullyConfirmed"
              : "semiConfirmed"
          );
          EnrollmentAPI.REnrollments({
            query: { syllabus: enrollment.syllabus },
          }).then(({ enrollments }) => {
            setEnrollments(enrollments);
          });
        })
        .catch((err) => {
          ALERT_ERROR(err);
          navigate("/courses");
        });
    }
    return () => {};
  }, [isLoading]);

  useEffect(() => {
    if (isLoadingEvaluation && pid) {
      EnrollmentAPI.REnrollment({ params: { _id: pid } })
        .then(({ enrollment }) => {
          setEnrollmentData(enrollment);
          setIsLoadingEvaluation(false);
        })
        .catch((err) => {
          alert(err.response?.data?.message ?? "에러가 발생했습니다.");
          navigate("/courses");
        });
    }
    return () => {};
  }, [isLoadingEvaluation]);

  return !isLoading ? (
    <>
      <div className={style.section}>
        <div className={style.course_header}>
          <CourseCoverImage
            coverImage={syllabusData?.coverImage || enrollmentData?.coverImage}
            coverColor={syllabusData?.coverColor || enrollmentData?.coverColor}
            classTitle={enrollmentData?.classTitle || ""}
            syllabusId={enrollmentData?.syllabus || pid || ""}
          />
          <div className={style.course_header_info}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className={style.title}>{enrollmentData?.classTitle}</div>
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
        <div style={{ marginTop: "12px" }}>
        <Tab
          dontUsePaths
          items={{
            계획서: (
              <>
                <div className={style.title} style={{ marginTop: "16px", marginBottom: "12px" }}>계획서</div>
                <ClassInfo />
              </>
            ),
            사용자: (
              <div style={{ marginTop: "16px" }}>
                <div className={style.title} style={{ marginBottom: "12px" }}>사용자</div>
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
              </div>
            ),
            평가: (
              <>
                <div className={style.title} style={{ marginTop: "16px", marginBottom: "12px" }}>평가</div>
                {formEvaluationHeader.length !== 0 && !isLoadingEvaluation ? (
                  <div>
                    {currentRegistration?.permissionEvaluationV2 ? (
                      <Table
                        type="object-array"
                        data={[enrollmentData]}
                        header={[
                          ...formEvaluationHeader,
                          {
                            text: "저장",
                            key: "evaluation",
                            onClick: (e: any) => {
                              if (!pid) return;
                              const evaluation: any = {};
                              for (let obj of fieldEvaluationList) {
                                evaluation[obj.text] = e[obj.key];
                              }
                              EnrollmentAPI.UEvaluation({
                                params: {
                                  _id: pid,
                                },
                                data: {
                                  evaluation,
                                },
                              })
                                .then(() => {
                                  alert(SUCCESS_MESSAGE);
                                  setIsLoadingEvaluation(true);
                                })
                                .catch((err: any) => ALERT_ERROR(err));
                            },
                            type: "button",

                            textAlign: "center",
                            width: "80px",
                            btnStyle: {
                              round: true,
                              border: true,
                              padding: "4px",
                              color: "red",
                              background: "#FFF1F1",
                            },
                            fontWeight: "600",
                          },
                        ]}
                      />
                    ) : (
                      <Table
                        type="object-array"
                        data={[enrollmentData]}
                        header={formEvaluationHeader}
                      />
                    )}
                  </div>
                ) : (
                  <Loading height={"calc(100vh - 55px)"} />
                )}
              </>
            ),
            ...(currentRegistration?.permissionActivityV2 && enrollmentData?.syllabus ? {
            활동: (
              <div style={{ marginTop: "16px" }}>
                <EnrolledActivityTab syllabusId={enrollmentData.syllabus} />
              </div>
            ),
            } : {}),
            ...(currentSchool?.boardEnabled !== false && currentSchool?.academyFeatures?.boardEnabled !== false && enrollmentData?.syllabus && !currentRegistration?.permissionActivityV2 ? {
            보드: (
              <div style={{ marginTop: "16px" }}>
                <AltBoardTab syllabusId={enrollmentData.syllabus} canCreate={false} />
              </div>
            ),
            } : {}),
          }}
          align="flex-start"
        />
        </div>
        {confirmStatusPopupActive && (
          <Popup
            setState={setConfirmStatusPopupActive}
            title="승인 상태"
            closeBtn
          >
            <Table
              type="object-array"
              data={courseData?.teachers}
              header={[
                {
                  text: "No",
                  type: "text",
                  key: "tableRowIndex",
                  width: "48px",
                  textAlign: "center",
                },
                {
                  text: "교사 ID",
                  key: "userId",
                  type: "text",
                  textAlign: "center",
                },
                {
                  text: "교사 이름",
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
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default CourseEnrollment;
