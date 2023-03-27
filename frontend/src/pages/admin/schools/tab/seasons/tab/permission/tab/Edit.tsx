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
import useApi from "hooks/useApi";
import _ from "lodash";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Select from "components/select/Select";

import { unzipPermission, zipPermission } from "functions/functions";
import Autofill from "components/input/Autofill";

type Props = {
  setPopupActive: any;
  _id: string;
  type: "syllabus" | "enrollment" | "evaluation";
  setIsLoading: any;
};

type Permission = {
  teacher: boolean;
  student: boolean;
  exceptions: any[];
};
const defaultPermission: Permission = {
  teacher: false,
  student: false,
  exceptions: [],
};

function Basic(props: Props) {
  const { SeasonApi } = useApi();

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [registrationList, setRegistrationList] = useState<any[]>([]);
  const [permissionParsed, setPermissionParsed] =
    useState<Permission>(defaultPermission);

  const exceptionRef = useRef<{ userId: string; isAllowed: boolean }>({
    userId: "",
    isAllowed: true,
  });

  useEffect(() => {
    if (isLoading) {
      SeasonApi.RSeasonWithRegistrations(props._id)
        .then((res) => {
          setRegistrationList(res.registrations ?? []);

          if (props.type === "syllabus")
            setPermissionParsed(
              unzipPermission(
                res?.permissionSyllabus ?? [],
                res.registrations ?? []
              )
            );
          else if (props.type === "enrollment")
            setPermissionParsed(
              unzipPermission(
                res?.permissionEnrollment ?? [],
                res.registrations ?? []
              )
            );
          else if (props.type === "evaluation")
            setPermissionParsed(
              unzipPermission(
                res?.permissionEvaluation ?? [],
                res.registrations ?? []
              )
            );
          else props.setPopupActive(false);
        })
        .then(() => {
          exceptionRef.current = { userId: "", isAllowed: true };
          setIsLoading(false);
        });
    }
  }, [isLoading]);

  return (
    <Popup
      style={{ borderRadius: "4px", maxWidth: "600px", width: "100%" }}
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
              defaultChecked={permissionParsed?.teacher}
              onChange={(b) => {
                SeasonApi.USeasonPermission({
                  _id: props._id,
                  type: props.type,
                  data: zipPermission({
                    ...permissionParsed,
                    teacher: b,
                  }),
                })
                  .then((res: any) => {
                    setIsLoading(true);
                    alert(SUCCESS_MESSAGE);
                  })
                  .catch((err) => {
                    alert(err.response.data.message);
                  });
              }}
            />
            <span>학생</span>
            <ToggleSwitch
              key={"toggleStudent"}
              defaultChecked={permissionParsed?.student}
              onChange={(b) => {
                SeasonApi.USeasonPermission({
                  _id: props._id,
                  type: props.type,
                  data: zipPermission({
                    ...permissionParsed,
                    student: b,
                  }),
                })
                  .then((res: any) => {
                    setIsLoading(true);
                    alert(SUCCESS_MESSAGE);
                  })
                  .catch((err) => {
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
              placeholder="userName(userId)"
              style={{ minHeight: "30px" }}
              options={[
                {
                  text: "",
                  value: "",
                },
                ...registrationList.map((r: any) => {
                  return {
                    text: `${r["userName"]}(${r["userId"]})`,
                    value: r["userId"],
                  };
                }),
              ]}
              onChange={(e: any) => {
                exceptionRef.current.userId = e;
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
                  SeasonApi.USeasonPermission({
                    _id: props._id,
                    type: props.type,
                    data: zipPermission({
                      ...permissionParsed,
                      exceptions: [
                        ...permissionParsed?.exceptions,
                        exceptionRef.current,
                      ],
                    }),
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
            data={permissionParsed.exceptions || []}
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
                  permissionParsed.exceptions.splice(e.tableRowIndex - 1, 1);
                  SeasonApi.USeasonPermission({
                    _id: props._id,
                    type: props.type,
                    data: zipPermission(permissionParsed),
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
