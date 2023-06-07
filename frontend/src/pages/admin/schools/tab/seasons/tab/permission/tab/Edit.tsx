/**
 * @file User Page Tab Item - Basic
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

import React, { useState, useRef, useEffect } from "react";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Select from "components/select/Select";

import Autofill from "components/input/Autofill";
import { TPermission, TPermissionException } from "types/seasons";
import useAPIv2 from "hooks/useAPIv2";

type Props = {
  setPopupActive: any;
  _id: string;
  type: "syllabus" | "enrollment" | "evaluation";
  setIsLoading: any;
};

function Basic(props: Props) {
  const { SeasonAPI } = useAPIv2();

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [registrationList, setRegistrationList] = useState<any[]>([]);

  const [teacher, setTeacher] = useState<boolean>(false);
  const [student, setStudent] = useState<boolean>(false);
  const [exceptions, setExceptions] = useState<TPermissionException[]>([]);

  const exceptionRef = useRef<TPermissionException>({
    registration: "",
    role: "",
    user: "",
    userId: "",
    userName: "",
    isAllowed: true,
  });

  const updatePermission = (permission: TPermission) => {
    setTeacher(permission.teacher);
    setStudent(permission.student);
    setExceptions(permission.exceptions);
  };

  useEffect(() => {
    if (isLoading) {
      SeasonAPI.RSeason({ params: { _id: props._id } })
        .then(({ season }) => {
          setRegistrationList(season.registrations ?? []);

          if (props.type === "syllabus") {
            updatePermission(season?.permissionSyllabusV2);
          } else if (props.type === "enrollment") {
            updatePermission(season?.permissionEnrollmentV2);
          } else if (props.type === "evaluation") {
            updatePermission(season?.permissionEvaluationV2);
          } else props.setPopupActive(false);
        })
        .then(() => {
          exceptionRef.current = {
            registration: "",
            role: "",
            user: "",
            userId: "",
            userName: "",
            isAllowed: true,
          };
          setIsLoading(false);
        });
    }
  }, [isLoading]);

  return (
    <Popup
      style={{ maxWidth: "600px", width: "100%" }}
      title={`${
        props.type === "syllabus"
          ? "수업 개설"
          : props.type === "enrollment"
          ? "수강신청"
          : "평가"
      } 권한 설정`}
      setState={(e: boolean) => {
        props.setIsLoading(true);
        props.setPopupActive(e);
      }}
      closeBtn
      contentScroll
    >
      {!isLoading ? (
        <div className={style.popup}>
          <div className={style.title}>역할별 설정</div>
          <div className={style.row}>
            <span>선생님</span>
            <ToggleSwitch
              key={"toggleTeacher"}
              defaultChecked={teacher}
              onChange={(b) => {
                SeasonAPI.USeasonPermission({
                  params: { _id: props._id, type: props.type },
                  data: { teacher: b },
                })
                  .then((res: any) => {
                    setTeacher(b);
                    alert(SUCCESS_MESSAGE);
                  })
                  .catch((err) => {
                    setIsLoading(true);
                    alert(err.response.data.message);
                  });
              }}
            />
            <span>학생</span>
            <ToggleSwitch
              key={"toggleStudent"}
              defaultChecked={student}
              onChange={(b) => {
                SeasonAPI.USeasonPermission({
                  params: { _id: props._id, type: props.type },
                  data: { student: b },
                })
                  .then((res: any) => {
                    setStudent(b);
                    alert(SUCCESS_MESSAGE);
                  })
                  .catch((err) => {
                    setIsLoading(true);
                    alert(err.response.data.message);
                  });
              }}
            />
          </div>

          <div className={style.title} style={{ marginTop: "24px" }}>
            예외 추가하기
          </div>

          <div className={style.row}>
            <Autofill
              placeholder="이름(ID)"
              style={{ minHeight: "30px" }}
              options={[
                {
                  text: "",
                  value: "",
                },
                ...registrationList.map((r: any) => {
                  return {
                    text: `${r["userName"]}(${r["userId"]})`,
                    value: JSON.stringify(r),
                  };
                }),
              ]}
              onChange={(e: any) => {
                const {
                  _id: registration,
                  role,
                  user,
                  userId,
                  userName,
                } = JSON.parse(e);
                exceptionRef.current = {
                  registration,
                  role,
                  user,
                  userId,
                  userName,
                  isAllowed: exceptionRef.current.isAllowed,
                };
              }}
            />
            <Select
              style={{ minHeight: "30px" }}
              options={[
                { text: "허용", value: "허용" },
                { text: "비허용", value: "비허용" },
              ]}
              appearence={"flat"}
              onChange={(e: string) => {
                exceptionRef.current.isAllowed = e === "허용";
              }}
            />

            <Button
              type={"ghost"}
              onClick={() => {
                if (exceptionRef.current.userId !== "") {
                  SeasonAPI.CSeasonPermissionException({
                    params: { _id: props._id, type: props.type },
                    data: {
                      ...exceptionRef.current,
                    },
                  })
                    .then(() => {
                      setIsLoading(true);
                      alert(SUCCESS_MESSAGE);
                    })
                    .catch((err) => {
                      alert(err.response.data.message);
                    });
                }
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              }}
            >
              추가
            </Button>
          </div>

          <div className={style.title} style={{ marginTop: "24px" }}>
            예외 목록
          </div>

          <Table
            type="object-array"
            data={exceptions || []}
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
              },
              {
                text: "역할",
                key: "role",
                textAlign: "center",
                type: "status",
                status: {
                  teacher: { text: "선생님", color: "blue" },
                  student: { text: "학생", color: "orange" },
                },
              },
              {
                text: "ID",
                key: "userId",
                type: "text",
                textAlign: "center",
              },
              {
                text: "이름",
                key: "userName",
                type: "text",
                textAlign: "center",
              },

              {
                text: "상태",
                key: "isAllowed",
                width: "120px",
                textAlign: "center",
                type: "status",
                status: {
                  false: { text: "비허용", color: "red" },
                  true: { text: "허용", color: "green" },
                },
              },
              {
                text: "삭제",
                key: "delete",
                type: "button",
                onClick: (e: any) => {
                  exceptions.splice(e.tableRowIndex - 1, 1);
                  SeasonAPI.DSeasonPermissionException({
                    params: { _id: props._id, type: props.type },
                    query: { registration: e.registration },
                  })
                    .then((res: any) => {
                      setIsLoading(true);
                      alert(SUCCESS_MESSAGE);
                    })
                    .catch((err) => {
                      alert(err.response.data.message);
                    });
                },
                width: "80px",
                textAlign: "center",
                btnStyle: {
                  border: true,
                  color: "red",
                  padding: "4px",
                  round: true,
                },
              },
            ]}
          />
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </Popup>
  );
}

export default Basic;
