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
import useDatabase from "hooks/useDatabase";
import { useAuth } from "contexts/authContext";

// tab pages
import style from "style/pages/courses/course.module.scss";

// components
import Divider from "components/divider/Divider";
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import EditorParser from "editor/EditorParser";

import Svg from "assets/svg/Svg";

import Send from "../notifications/popup/Send";
import EnrollBulkPopup from "./tab/EnrollBulkPopup";

import _ from "lodash";

import ViewPopup from "./tab/ViewPopup";

import { checkPermission } from "functions/functions";

type Props = {};

type receiverSelectedList = {
  [key: string]: boolean;
};

const CoursePid = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { currentUser, currentRegistration } = useAuth();
  const navigate = useNavigate();

  const database = useDatabase();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [enrollmentData, setEnrollmentData] = useState<any>();
  const [viewPopupActive, setViewPopupActive] = useState<boolean>(false);

  const [formEvaluationHeader, setFormEvaluationHeader] = useState<any[]>([]);

  async function getSeason(_id: string) {
    const res = await database.R({
      location: `seasons/${_id}`,
    });
    return res;
  }

  async function getEvaluation(_id: string) {
    const res = await database.R({
      location: `enrollments/${_id}`,
    });
    return res;
  }

  async function updateEvaluation(enrollment: string, evaluation: any[]) {
    const { evaluation: res } = await database.U({
      location: `enrollments/${enrollment}/evaluation`,
      data: {
        new: evaluation,
      },
    });
    return res;
  }

  useEffect(() => {
    if (isLoading) {
      getEnrollmentData()
        .then((result) => {
          setEnrollmentData(result);
          getSeason(result.season).then((res: any) => {
            if (
              checkPermission(
                res.permissionEvaluation,
                currentUser.userId,
                currentRegistration.role
              )
            ) {
              setFormEvaluationHeader([
                ...res.formEvaluation
                  .map((val: any) => {
                    if (val.auth.edit.student)
                      return {
                        text: val.label,
                        key: "evaluation." + val.label,
                        type: "input",
                      };
                    if (val.auth.view.student) {
                      return {
                        text: val.label,
                        key: "evaluation." + val.label,
                        type: "text",
                        whiteSpace: "pre-wrap",
                      };
                    }
                    return undefined;
                  })
                  .filter((element: any, i: number) => element !== undefined),
                {
                  text: "저장",
                  key: "evaluation",
                  onClick: (e: any) => {
                    const evaluation: any = {};
                    for (let obj of formEvaluationHeader) {
                      evaluation[obj.text] = e[obj.key];
                    }
                    updateEvaluation(pid || "", evaluation)
                      .then((res: any) => {
                        alert("수정되었습니다.");
                        console.log("update eval: res is ", res);
                        setEnrollmentData({
                          ...enrollmentData,
                          evaluation: res,
                        });
                      })
                      .catch((err: any) => alert(err.response.data.message));
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
              ]);
              setIsLoading(false);
            } else {
              setFormEvaluationHeader([
                ...res.formEvaluation.map((val: any) => {
                  return {
                    text: val.label,
                    key: "evaluation." + val.label,
                    type: "text",
                    whiteSpace: "pre-wrap",
                  };
                }),
              ]);
              setIsLoading(false);
            }
          });
        })
        .catch((err) => {
          alert(err.response.data.message);
          navigate("/courses");
        });
    }
    return () => {};
  }, [isLoading]);

  async function getEnrollmentData() {
    const result = await database.R({
      location: `enrollments/${pid}`,
    });
    return result;
  }

  useEffect(() => {
    if (isLoading) {
      navigate("#수강 정보");
      getEnrollmentData()
        .then((result) => {
          console.log("result of getEnrollmentData is ", result);
          setEnrollmentData(result);
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
    <div className={style.section}>
      <NavigationLinks />
      <div className={style.title}>{enrollmentData?.classTitle}</div>
      <div className={style.categories_container}>
        <div className={style.categories}>
          <div
            className={style.category}
            onClick={() => {
              setViewPopupActive(true);
            }}
          >
            강의계획서 조회
          </div>
        </div>
      </div>
      <Divider />

      <div style={{ height: "24px" }}></div>

      <>
        <div style={{ display: "flex" }}>
          <div
            style={{
              flex: "auto",
              marginLeft: "12px",
              display: "flex",
              gap: "12px",
            }}
          >
            <div className={style.title}>평가</div>
          </div>
        </div>
        <Table
          type="object-array"
          data={[enrollmentData]}
          header={formEvaluationHeader}
        />
      </>

      {viewPopupActive && pid && (
        <ViewPopup
          course={enrollmentData.syllabus}
          setPopupActive={setViewPopupActive}
        />
      )}
    </div>
  ) : (
    <>로딩중</>
  );
};

export default CoursePid;
