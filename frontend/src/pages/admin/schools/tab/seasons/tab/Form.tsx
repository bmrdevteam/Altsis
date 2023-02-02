/**
 * @file Seasons Page Tab Item - Form
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
import useApi from "hooks/useApi";

// components
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import style from "style/pages/admin/schools.module.scss";

type Props = {
  _id: string;
};

const Form = (props: Props) => {
  const { SeasonApi, FormApi } = useApi();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isActivated, setIsActivated] = useState<boolean>();
  const [isActivatedFirst, setIsActivatedFirst] = useState<boolean>();

  const [formTimetable, setFormTimetable] = useState<any>();
  const [formSyllabus, setFormSyllabus] = useState<any>();
  const formEvaluation = useRef<any[]>([]);
  const [formTimetablePopupActive, setFormTimetablePopupActive] =
    useState<boolean>(false);
  const [formSyllabusPopupActive, setFormSyllabusPopupActive] =
    useState<boolean>(false);
  const [formEvaluationSelectPopupActive, setFormEvaluationSelectPopupActive] =
    useState<boolean>(false);
  const [formEvaluationSelectIndex, setFormEvaluationSelectIndex] =
    useState<number>(0);

  const [forms, setForms] = useState<any>();

  const updateFormData = (seasonData: any) => {
    setFormSyllabus(seasonData?.formSyllabus || {});
    setFormTimetable(seasonData?.formTimetable || {});
    formEvaluation.current = seasonData?.formEvaluation || [];

    setIsActivated(seasonData.isActivated);
    setIsActivatedFirst(seasonData.isActivatedFirst);
  };

  useEffect(() => {
    if (isLoading) {
      SeasonApi.RSeason(props._id)
        .then((res) => {
          updateFormData(res);
        })
        .then(() => setIsLoading(false));
    }
    return () => {};
  }, [isLoading]);

  return (
    <>
      <>
        <div className={style.form} style={{ marginTop: "24px" }}>
          <div className={style.item}>
            <div className={style.title}>시간표 양식</div>

            <Button
              type="ghost"
              onClick={() => {
                FormApi.RForms()
                  .then((res) => {
                    setForms(res);
                  })
                  .then(() => setFormTimetablePopupActive(true));
              }}
              disabled={isActivatedFirst}
            >
              {(!isLoading && formTimetable.title) ??
                (isActivatedFirst ? "없음" : "선택")}
            </Button>
          </div>
          <div className={style.item}>
            <div className={style.title}>강의 계획서 양식</div>
            <Button
              type="ghost"
              onClick={() => {
                FormApi.RForms()
                  .then((res) => {
                    setForms(res);
                  })
                  .then(() => setFormSyllabusPopupActive(true));
              }}
              disabled={isActivatedFirst}
            >
              {!isLoading &&
                (formSyllabus.title ?? (isActivatedFirst ? "없음" : "선택"))}
            </Button>
          </div>
        </div>

        <div className={style.form} style={{ marginTop: "24px" }}>
          <div className={style.item}>
            <div
              className={style.title}
              style={{
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              평가 양식
            </div>

            <Table
              type="object-array"
              data={formEvaluation.current ?? []}
              onChange={(e: any[]) => {
                let _data: any[] = [];
                e.forEach((elem) => {
                  if (elem.label) {
                    elem.type = elem.type || "input";
                    elem.authOption = elem.authOption || "editByTeacher";
                    elem.auth = {
                      edit: {
                        teacher:
                          elem.authOption === "editByTeacher" ||
                          elem.authOption === "editByTeacherAndStudentCanView",
                        student: elem.authOption === "editByStudent",
                      },
                      view: {
                        teacher: true,
                        student:
                          elem.authOption === "editByStudent" ||
                          elem.authOption === "editByTeacherAndStudentCanView",
                      },
                    };
                    elem.combineBy = elem.combineBy || "term";

                    _data.push(elem);
                  }
                });
                formEvaluation.current = _data;
                SeasonApi.USeasonForm({
                  _id: props._id,
                  type: "evaluation",
                  data: formEvaluation.current,
                })
                  .then((res) => {
                    // alert("success");
                    updateFormData(res);
                  })
                  .catch((err) => {
                    alert(err.response.data.message);
                  });
              }}
              header={
                !isActivatedFirst
                  ? [
                      {
                        type: "text",
                        text: "평가 항목",
                        key: "label",
                      },
                      {
                        text: "유형",
                        key: "type",
                        fontSize: "12px",
                        fontWeight: "600",
                        type: "status",
                        status: {
                          input: {
                            text: "텍스트",
                            color: "#B33F00",
                          },
                          "input-number": {
                            text: "숫자",
                            color: "#00B3AD",
                          },
                          select: {
                            text: "선택 +",
                            color: "#8657ff",
                            onClick: (row) => {
                              setFormEvaluationSelectIndex(row.tableRowIndex);
                              setFormEvaluationSelectPopupActive(true);
                            },
                          },
                        },
                        width: "80px",
                        textAlign: "center",
                      },
                      {
                        text: "평가자",
                        key: "authOption",
                        fontSize: "12px",
                        fontWeight: "600",
                        type: "status",
                        status: {
                          editByTeacher: {
                            text: "선생님",
                            color: "red",
                          },
                          editByStudent: {
                            text: "학생",
                            color: "blue",
                          },
                          editByTeacherAndStudentCanView: {
                            text: "선생님(학생 조회 가능)",
                            color: "purple",
                          },
                        },
                        width: "180px",
                        textAlign: "center",
                      },
                      {
                        text: "평가단위",
                        key: "combineBy",
                        fontSize: "12px",
                        fontWeight: "600",
                        type: "status",
                        status: {
                          term: {
                            text: "학기",
                            color: "green",
                          },
                          year: {
                            text: "학년도",
                            color: "gray",
                          },
                        },
                        width: "100px",
                        textAlign: "center",
                      },
                      {
                        text: "수정",
                        type: "rowEdit",
                        fontSize: "12px",
                        fontWeight: "600",
                        textAlign: "center",
                        width: "80px",
                      },
                    ]
                  : [
                      {
                        type: "text",
                        text: "평가 항목",
                        key: "label",
                      },
                      {
                        text: "유형",
                        key: "type",
                        fontSize: "12px",
                        fontWeight: "600",
                        type: "status",
                        status: {
                          input: {
                            text: "텍스트",
                            color: "#B33F00",
                          },
                          "input-number": {
                            text: "숫자",
                            color: "#00B3AD",
                          },
                        },
                        width: "80px",
                        textAlign: "center",
                      },
                      {
                        text: "평가자",
                        key: "authOption",
                        fontSize: "12px",
                        fontWeight: "600",
                        type: "status",
                        status: {
                          editByTeacher: {
                            text: "선생님",
                            color: "red",
                          },
                          editByStudent: {
                            text: "학생",
                            color: "blue",
                          },
                          editByTeacherAndStudentCanView: {
                            text: "선생님(학생 조회 가능)",
                            color: "purple",
                          },
                        },
                        width: "180px",
                        textAlign: "center",
                      },
                      {
                        text: "평가단위",
                        key: "combineBy",
                        fontSize: "12px",
                        fontWeight: "600",
                        type: "status",
                        status: {
                          term: {
                            text: "학기",
                            color: "green",
                          },
                          year: {
                            text: "학년도",
                            color: "gray",
                          },
                        },
                        width: "100px",
                        textAlign: "center",
                      },
                    ]
              }
            />
          </div>
        </div>
      </>

      {formTimetablePopupActive && (
        <Popup
          style={{ borderRadius: "4px", maxWidth: "600px", width: "100%" }}
          title={`시간표 양식 선택`}
          setState={setFormTimetablePopupActive}
          closeBtn
        >
          <Table
            type="object-array"
            data={forms?.filter((val: any) => val.type === "timetable")}
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
              },
              { text: "제목", key: "title", type: "text" },
              {
                text: "선택",
                key: "select",
                type: "button",
                onClick: (e: any) => {
                  FormApi.RForm(e._id).then((res) => {
                    SeasonApi.USeasonForm({
                      _id: props._id,
                      type: "timetable",
                      data: res,
                    })
                      .then((res) => {
                        updateFormData(res);
                        setFormTimetablePopupActive(false);
                      })
                      .catch((err) => {
                        alert(err.response.data.message);
                      });
                  });
                },
                width: "80px",
                textAlign: "center",
                btnStyle: {
                  border: true,
                  color: "black",
                  padding: "4px",
                  round: true,
                },
              },
            ]}
          />
        </Popup>
      )}
      {formSyllabusPopupActive && (
        <Popup
          style={{ borderRadius: "4px", maxWidth: "600px", width: "100%" }}
          title={`강의계획서 양식 선택`}
          setState={setFormSyllabusPopupActive}
          closeBtn
        >
          <Table
            type="object-array"
            data={forms?.filter((val: any) => val.type === "syllabus")}
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
              },
              { text: "제목", key: "title", type: "text" },
              {
                text: "선택",
                key: "select",
                type: "button",
                onClick: (e: any) => {
                  FormApi.RForm(e._id).then((res) => {
                    SeasonApi.USeasonForm({
                      _id: props._id,
                      type: "syllabus",
                      data: res,
                    })
                      .then((res) => {
                        updateFormData(res);
                        setFormSyllabusPopupActive(false);
                      })
                      .catch((err) => {
                        alert(err.response.data.message);
                      });
                  });
                },
                width: "80px",
                textAlign: "center",
                btnStyle: {
                  border: true,
                  color: "black",
                  padding: "4px",
                  round: true,
                },
              },
            ]}
          />
        </Popup>
      )}
      {formEvaluationSelectPopupActive && (
        <Popup
          style={{ borderRadius: "4px", maxWidth: "600px", width: "100%" }}
          title={`옵션 변경`}
          setState={setFormEvaluationSelectPopupActive}
          closeBtn
        >
          <Table
            type="string-array"
            data={
              formEvaluation.current[formEvaluationSelectIndex-1]?.options ?? []
            }
            onChange={(e) => {
              let _data:any[] = [];
              e.map((o) => _data.push(o["0"]));
              console.log(formEvaluation.current);
              formEvaluation.current[formEvaluationSelectIndex-1].options = _data
              SeasonApi.USeasonForm({
                _id: props._id,
                type: "evaluation",
                data: formEvaluation.current,
              })
                .then((res) => {
                  // alert("success");
                })
                .catch((err) => {
                  alert(err.response.data.message);
                });
            }}
            header={[
              {
                text: "옵션",
                key: "0",
                type: "text",
              },
              {
                text: "수정",
                type: "rowEdit",
                fontSize: "12px",
                fontWeight: "600",
                textAlign: "center",
                width: "80px",
              },
            ]}
          />
        </Popup>
      )}
    </>
  );
};

export default Form;
