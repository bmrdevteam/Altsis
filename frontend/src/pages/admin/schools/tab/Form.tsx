/**
 * @file Schools Page Tab Item - Form
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
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";

// components
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import style from "style/pages/admin/schools.module.scss";

type Props = {};

const Form = (props: Props) => {
  const database = useDatabase();

  const { currentSchool, setCurrentSchool } = useAuth();

  const [forms, setForms] = useState<any>();
  const [formEvaluation, setFormEvaluation] = useState<any[]>(
    currentSchool.formEvaluation || []
  );

  const [formTimetablePopupActive, setFormTimetablePopupActive] =
    useState<boolean>(false);
  const [formSyllabusPopupActive, setFormSyllabusPopupActive] =
    useState<boolean>(false);
  const [formEvaluationPopupActive, setFormEvaluationPopupActive] =
    useState<boolean>(false);

  async function getForms() {
    const { forms: result } = await database.R({ location: "forms" });
    return result;
  }
  async function getForm(id: string) {
    const result = await database.R({ location: `forms/${id}` });
    return result;
  }

  async function updateFormTimetable(data: any) {
    const { formTimetable: result } = await database.U({
      location: `schools/${currentSchool.school}/form/timetable`,
      data: { new: data },
    });
    return result;
  }
  async function updateFormSyllabus(data: any) {
    const { formSyllabus: result } = await database.U({
      location: `schools/${currentSchool.school}/form/syllabus`,
      data: { new: data },
    });
    return result;
  }
  async function updateFormEvaluation(data: any) {
    const { formEvaluation: result } = await database.U({
      location: `schools/${currentSchool.school}/form/evaluation`,
      data: { new: data },
    });
    return result;
  }

  useEffect(() => {
    getForms().then((res) => {
      setForms(res);
    });
  }, []);

  return (
    <>
      <div className={style.form} style={{ marginTop: "24px" }}>
        <div className={style.item}>
          <div className={style.title}>시간표 양식</div>

          <Button
            style={{ marginTop: "12px" }}
            type="ghost"
            onClick={() => {
              setFormTimetablePopupActive(true);
            }}
          >
            {currentSchool.formTimetable?.title ?? "선택"}
          </Button>
        </div>
        <div className={style.item}>
          <div className={style.title}>강의 계획서 양식</div>
          <Button
            style={{ marginTop: "12px" }}
            type="ghost"
            onClick={() => {
              setFormSyllabusPopupActive(true);
            }}
          >
            {currentSchool.formSyllabus?.title ?? "선택"}
          </Button>
        </div>
        <div className={style.item}>
          <div className={style.title}>평가 양식</div>
          <Button
            style={{ marginTop: "12px" }}
            type="ghost"
            onClick={() => {
              setFormEvaluationPopupActive(true);
            }}
          >
            설정
          </Button>
        </div>
      </div>
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
                  const id = e._id;

                  getForm(id).then((res) => {
                    updateFormTimetable(res).then(() => {
                      console.log("res is ", res);
                      setCurrentSchool({
                        ...currentSchool,
                        formTimetable: res,
                      });
                      setFormTimetablePopupActive(false);
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
                  const id = e._id;

                  getForm(id).then((res) => {
                    updateFormSyllabus(res).then(() => {
                      console.log("res is ", res);
                      setCurrentSchool({
                        ...currentSchool,
                        formSyllabus: res,
                      });
                      setFormSyllabusPopupActive(false);
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
      {formEvaluationPopupActive && (
        <Popup
          style={{ borderRadius: "4px", maxWidth: "600px", width: "100%" }}
          title={`평가 양식 설정`}
          setState={setFormEvaluationPopupActive}
          closeBtn
          contentScroll
          footer={
            <Button
              type={"ghost"}
              onClick={() => {
                const _formEvaluation = formEvaluation?.map((elem: any) => {
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

                  return elem;
                });

                updateFormEvaluation(_formEvaluation).then((res: any) => {
                  console.log("res is ", res);
                  setFormEvaluation(res);
                  currentSchool.formEvaluation = res;

                  setCurrentSchool(currentSchool);
                  // setFormEvaluationPopupActive(false);
                });
              }}
            >
              저장
            </Button>
          }
        >
          <Table
            type="object-array"
            data={currentSchool.formEvaluation ?? []}
            onChange={(e: any[]) => {
              setFormEvaluation(e.filter((elem: any) => elem.label));
            }}
            header={[
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
