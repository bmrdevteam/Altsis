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
import { useState, useEffect } from "react";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";

import style from "style/pages/admin/schools.module.scss";

type Props = {
  seasonData: any;
};

const Form = (props: Props) => {
  const [formTimetable, setFormTimetable] = useState<any>();
  const [formSyllabus, setFormSyllabus] = useState<any>();
  const [formEvaluation, setFormEvaluation] = useState<any[]>([]);

  useEffect(() => {
    setFormSyllabus(props.seasonData?.formSyllabus || {});
    setFormTimetable(props.seasonData?.formTimetable || {});
    setFormEvaluation(props.seasonData?.formEvaluation || []);
    return () => {};
  }, []);

  return (
    <>
      <>
        <div className={style.form} style={{ marginTop: "24px" }}>
          <div className={style.item}>
            <div className={style.title}>시간표 양식</div>

            <Button type="ghost" disabled>
              {formTimetable?.title ?? "없음"}
            </Button>
          </div>
          <div className={style.item}>
            <div className={style.title}>강의 계획서 양식</div>
            <Button type="ghost" disabled>
              {formSyllabus?.title ?? "없음"}
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
              data={formEvaluation ?? []}
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
                    select: {
                      text: "선택 +",
                      color: "#8657ff",
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
              ]}
            />
          </div>
        </div>
      </>
    </>
  );
};

export default Form;
