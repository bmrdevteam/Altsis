/**
 * @file School Page Tab Item - Permission
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
import useApi from "hooks/useApi";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Popup from "components/popup/Popup";
import Select from "components/select/Select";

import _ from "lodash";

type Props = {
  _id: string;
};

const Permission = (props: Props) => {
  const { SeasonApi, RegistrationApi } = useApi();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [permissionSyllabusParsed, setPermissionSyllabusParsed] =
    useState<any>();
  const [permissionEnrollmentParsed, setPermissionEnrollmentParsed] =
    useState<any>();
  const [permissionEvaluationParsed, setPermissionEvaluationParsed] =
    useState<any>();

  /* additional document list */
  const [registrationList, setRegistrationList] = useState<any>([]);
  const [registrationOptionList, setRegistrationOptionList] = useState<any>([]);

  /* popup activation */
  const [editPopupActive, setEditPopupActive] = useState<boolean>(false);
  const [permissionType, setPermissionType] = useState<string>("");

  const [isLoadingPermissionData, setIsLoadingPermissionData] =
    useState<boolean>(false);
  const [permissionData, setPermissionData] = useState<any>();

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedIsAllowed, setSelectedIsAllowed] = useState<string>("");

  const parsePermission = (permission: Array<Array<any>>) => {
    let isTeacherAllowed = false;
    let isStudentAllowed = false;
    const exceptions = [];

    for (let i = 0; i < permission.length; i++) {
      if (permission[i][0] === "role") {
        if (permission[i][1] === "teacher") {
          isTeacherAllowed = permission[i][2];
        } else if (permission[i][1] === "student") {
          isStudentAllowed = permission[i][2];
        }
      } else {
        exceptions.push({
          index: i,
          userId: permission[i][1],
          isAllowed: permission[i][2],
          ...getRegistrationDataByUserId(permission[i][1]),
        });
      }
    }
    return { isTeacherAllowed, isStudentAllowed, exceptions };
  };

  const zipPermission = (permissionData: any) => {
    const _permission = [];

    // console.log(permissionData);
    for (let i = 0; i < permissionData.exceptions.length; i++) {
      _permission.push([
        "userId",
        permissionData.exceptions[i]["userId"],
        permissionData.exceptions[i]["isAllowed"],
      ]);
    }
    _permission.push(["role", "teacher", permissionData?.isTeacherAllowed]);
    _permission.push(["role", "student", permissionData?.isStudentAllowed]);

    return _permission;
  };

  const getRegistrationDataByUserId = (userId: string) => {
    const res = _.find(registrationList, { userId });
    // return { userName: "임시", role: "임시" };
    return res
      ? { userName: res.userName, role: res.role }
      : { userName: "", role: "" };
  };

  const updatePermissions = (seasonData: any) => {
    setPermissionSyllabusParsed(
      parsePermission(seasonData.permissionSyllabus || {})
    );
    setPermissionEnrollmentParsed(
      parsePermission(seasonData.permissionEnrollment || {})
    );
    setPermissionEvaluationParsed(
      parsePermission(seasonData.permissionEvaluation || {})
    );
  };

  useEffect(() => {
    if (isLoading) {
      SeasonApi.RSeason(props._id)
        .then((res) => {
          updatePermissions(res);
          setIsLoading(false);
        })
        .then(() => setIsLoading(false));
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoadingPermissionData) {
      if (permissionType === "syllabus")
        setPermissionData(permissionSyllabusParsed);
      else if (permissionType === "enrollment")
        setPermissionData(permissionEnrollmentParsed);
      else setPermissionData(permissionEvaluationParsed);
      setIsLoadingPermissionData(false);
    }
  }, [isLoadingPermissionData]);

  useEffect(() => {
    if (editPopupActive) {
      RegistrationApi.RRegistrations({ season: props._id }).then((res) => {
        setRegistrationList(res);
      });
    }
  }, [editPopupActive]);

  useEffect(() => {
    setRegistrationOptionList([
      {
        text: "",
        value: "",
      },
      ...registrationList
        ?.filter((r: any) => {
          if (!r["userId"]) return false;
          return true;
        })
        .map((r: any) => {
          return {
            text: `${r["userName"]}(${r["userId"]})`,
            value: r["userId"],
          };
        }),
    ]);
  }, [registrationList]);

  return (
    <div style={{ marginTop: "24px" }}>
      <Table
        type="object-array"
        data={
          !isLoading
            ? [
                {
                  type: "syllabus",
                  ...permissionSyllabusParsed,
                },
                {
                  type: "enrollment",
                  ...permissionEnrollmentParsed,
                },
                {
                  type: "evaluation",
                  ...permissionEvaluationParsed,
                },
              ]
            : []
        }
        header={[
          {
            text: "권한",
            key: "type",
            width: "120px",
            textAlign: "center",
            type: "status",
            status: {
              syllabus: { text: "수업 개설 권한" },
              enrollment: { text: "수강신청 권한" },
              evaluation: { text: "평가 권한" },
            },
          },

          {
            text: "선생님",
            key: "isTeacherAllowed",
            width: "52px",
            textAlign: "center",
            type: "status",
            status: {
              false: { text: "N", color: "red" },
              true: { text: "Y", color: "green" },
            },
          },
          {
            text: "학생",
            key: "isStudentAllowed",
            width: "52px",
            textAlign: "center",
            type: "status",
            status: {
              false: { text: "N", color: "red" },
              true: { text: "Y", color: "green" },
            },
          },
          {
            text: "설정",
            key: "detail",
            type: "button",
            onClick: (e: any) => {
              setPermissionType(e.type);
              setIsLoadingPermissionData(true);
              setEditPopupActive(true);
            },
            width: "52px",
            textAlign: "center",
            btnStyle: {
              border: true,
              color: "var(--accent-1)",
              padding: "4px",
              round: true,
            },
          },
        ]}
      />

      {!isLoadingPermissionData && editPopupActive && (
        <Popup
          style={{ borderRadius: "4px", maxWidth: "600px", width: "100%" }}
          title={`${
            permissionType === "syllabus"
              ? "수업 개설"
              : permissionType === "enrollment"
              ? "수강신청"
              : "평가"
          } 권한 설정`}
          setState={setEditPopupActive}
          closeBtn
          contentScroll
        >
          <div className={style.popup}>
            <div className={style.title}>역할별 설정</div>
            <div className={style.row}>
              <span>선생님</span>
              <ToggleSwitch
                defaultChecked={permissionData?.isTeacherAllowed}
                onChange={(b) => {
                  SeasonApi.USeasonPermission({
                    _id: props._id,
                    type: permissionType,
                    data: zipPermission({
                      ...permissionData,
                      isTeacherAllowed: b,
                    }),
                  })
                    .then((res: any) => {
                      alert("성공적으로 처리되었습니다. 😘💌");
                      updatePermissions(res);
                    })
                    .catch((err) => {
                      alert(err.response.data.message);
                    });
                }}
              />
              <span>학생</span>
              <ToggleSwitch
                defaultChecked={permissionData?.isStudentAllowed}
                onChange={(b) => {
                  permissionData.isStudentAllowed = b;
                  SeasonApi.USeasonPermission({
                    _id: props._id,
                    type: permissionType,
                    data: zipPermission({
                      ...permissionData,
                      isStudentAllowed: b,
                    }),
                  })
                    .then((res: any) => {
                      alert("성공적으로 처리되었습니다. 😘💌");
                      updatePermissions(res);
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
              <Select
                style={{ minHeight: "30px" }}
                options={registrationOptionList}
                onChange={(e: any) => {
                  setSelectedUserId(e);
                }}
                appearence={"flat"}
              />
              <Select
                style={{ minHeight: "30px" }}
                options={[
                  { text: "허용", value: "허용" },
                  { text: "비허용", value: "비허용" },
                ]}
                setValue={setSelectedIsAllowed}
                appearence={"flat"}
              />
              <Button
                type={"ghost"}
                onClick={() => {
                  // console.log(permissionData);
                  if (selectedUserId) {
                    SeasonApi.USeasonPermission({
                      _id: props._id,
                      type: permissionType,
                      data: zipPermission({
                        ...permissionData,
                        exceptions: [
                          ...permissionData?.exceptions,
                          {
                            userId: selectedUserId,
                            isAllowed: selectedIsAllowed === "허용",
                            ...getRegistrationDataByUserId(selectedUserId),
                          },
                        ],
                      }),
                    })
                      .then((res: any) => {
                        alert("성공적으로 처리되었습니다. 😘💌");
                        setSelectedUserId("");
                        updatePermissions(res);
                      })
                      .then(() => setIsLoadingPermissionData(true))
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
              예외 설정
            </div>

            <Table
              type="object-array"
              data={permissionData?.exceptions || []}
              header={[
                {
                  text: "No",
                  type: "text",
                  key: "tableRowIndex",
                  width: "48px",
                  textAlign: "center",
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
                  text: "역할",
                  key: "role",
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
                    permissionData.exceptions.splice(e.tableRowIndex - 1, 1);

                    SeasonApi.USeasonPermission({
                      _id: props._id,
                      type: permissionType,
                      data: zipPermission(permissionData),
                    })
                      .then((res: any) => {
                        alert("성공적으로 처리되었습니다. 😘💌");
                        updatePermissions(res);
                        setIsLoadingPermissionData(true);
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
        </Popup>
      )}
    </div>
  );
};

export default Permission;
