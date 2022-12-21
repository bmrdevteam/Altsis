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
import useDatabase from "hooks/useDatabase";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Popup from "components/popup/Popup";
import Select from "components/select/Select";

import _ from "lodash";

type Props = {
  seasonData: any;
  setSelectedSeason: any;
};

const Permission = (props: Props) => {
  const database = useDatabase();

  /* document list */
  const [permissionSyllabus, setPermissionSyllabus] = useState<any>(
    props.seasonData.permissionSyllabus
  );
  const [permissionEnrollment, setPermissionEnrollment] = useState<any>(
    props.seasonData.permissionEnrollment
  );
  const [permissionEvaluation, setPermissionEvaluation] = useState<any>(
    props.seasonData.permissionEvaluation
  );

  /* additional document list */
  const [registrationList, setRegistrationList] = useState<any>([]);
  const [registrationOptionList, setRegistrationOptionList] = useState<any>([]);

  /* popup activation */
  const [editPopupActive, setEditPopupActive] = useState<boolean>(false);

  /* permission type */
  const [permissionType, setPermissionType] = useState<string>("");

  /* document fields */
  const [isTeacherAllowed, setIsTeacherAllowed] = useState<any>(false);
  const [isStudentAllowed, setIsStudentAllowed] = useState<any>(false);
  const [exceptions, setExceptions] = useState<any>([]);

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedIsAllowed, setSelectedIsAllowed] = useState<string>("");

  const parsePermission = (permission: Array<Array<any>>) => {
    setIsTeacherAllowed(false);
    setIsStudentAllowed(false);
    const _exceptions = [];

    for (let i = 0; i < permission.length; i++) {
      if (permission[i][0] === "role") {
        if (permission[i][1] === "teacher") {
          setIsTeacherAllowed(permission[i][2]);
        } else if (permission[i][1] === "student") {
          setIsStudentAllowed(permission[i][2]);
        }
      } else {
        _exceptions.push({
          index: i,
          userId: permission[i][1],
          isAllowed: permission[i][2],
          ...getRegistrationDataByUserId(permission[i][1]),
        });
      }
    }

    setExceptions(_exceptions);
  };

  const zipPermission = () => {
    const _permission = [];

    for (let i = 0; i < exceptions.length; i++) {
      _permission.push([
        "userId",
        exceptions[i]["userId"],
        exceptions[i]["isAllowed"],
      ]);
    }
    _permission.push(["role", "teacher", isTeacherAllowed]);
    _permission.push(["role", "student", isStudentAllowed]);

    return _permission;
  };

  const getRegistrationDataByUserId = (userId: string) => {
    const res = _.find(registrationList, { userId });
    // return { userName: "임시", role: "임시" };
    return res
      ? { userName: res.userName, role: res.role }
      : { userName: "", role: "" };
  };

  async function updatePermission(_permission: any) {
    const result = await database.U({
      location: `seasons/${props.seasonData?._id}/permission/${permissionType}`,
      data: {
        new: _permission,
      },
    });

    return result;
  }

  async function getRegistrationList() {
    const { registrations } = await database.R({
      location: `registrations?season=${props.seasonData._id}`,
    });

    return registrations;
  }

  useEffect(() => {
    if (editPopupActive) {
      getRegistrationList().then((res) => {
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
    <>
      <div className={style.form} style={{ marginTop: "24px" }}>
        <div className={style.item}>
          <div className={style.title}>수업 개설 권한</div>
          <Button
            type="ghost"
            onClick={() => {
              parsePermission(permissionSyllabus);
              setPermissionType("syllabus");
              setEditPopupActive(true);
            }}
          >
            설정
          </Button>
        </div>
        <div className={style.item}>
          <div className={style.title}>수강신청 권한</div>
          <Button
            type="ghost"
            onClick={() => {
              parsePermission(permissionEnrollment);
              setPermissionType("enrollment");
              setEditPopupActive(true);
            }}
          >
            설정
          </Button>
        </div>
        <div className={style.item}>
          <div className={style.title}>평가 권한</div>
          <Button
            type="ghost"
            onClick={() => {
              parsePermission(permissionEvaluation);
              setPermissionType("evaluation");
              setEditPopupActive(true);
            }}
          >
            설정
          </Button>
        </div>
      </div>
      {editPopupActive && (
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
        >
          <div className={style.popup}>
            <div className={style.title}>역할별 설정</div>
            <div className={style.row}>
              <span>선생님</span>
              <ToggleSwitch
                defaultChecked={isTeacherAllowed}
                onChange={(e: any) => {
                  setIsTeacherAllowed(e.target.checked);
                }}
              />
              <span>학생</span>
              <ToggleSwitch
                defaultChecked={isStudentAllowed}
                onChange={(e: any) => {
                  setIsStudentAllowed(e.target.checked);
                }}
              />
            </div>

            <div className={style.title} style={{ marginTop: "24px" }}>
              예외 추가히기
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
                  if (selectedUserId) {
                    setExceptions([
                      ...exceptions,
                      {
                        userId: selectedUserId,
                        isAllowed: selectedIsAllowed === "허용",
                        ...getRegistrationDataByUserId(selectedUserId),
                      },
                    ]);
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
                  key: "index",
                  type: "button",
                  onClick: (e: any) => {
                    exceptions.splice(e.tableRowIndex - 1, 1);
                    setExceptions([...exceptions]);
                  },
                  width: "80px",
                  textAlign: "center",
                  // textStyle: {
                  //   padding: "0 10px",
                  //   border: "var(--border-default)",
                  //   background: "rgba(255, 200, 200, 0.25)",
                  //   borderColor: "rgba(255, 200, 200)",
                  // },
                },
              ]}
            />
          </div>
          <div className={style.row}>
            <Button
              type={"ghost"}
              style={{
                borderRadius: "4px",
                height: "32px",
                marginTop: "24px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              }}
              onClick={(e: any) => {
                const _permission = zipPermission();
                updatePermission(_permission)
                  .then((res: any) => {
                    alert("success");
                    if (permissionType === "syllabus") {
                      setPermissionSyllabus(res.data);
                      props.seasonData.permissionSyllabus = res.data;
                      props.setSelectedSeason(props.seasonData);
                    } else if (permissionType === "enrollment") {
                      setPermissionEnrollment(res.data);
                      props.seasonData.permissionEnrollment = res.data;
                      props.setSelectedSeason(props.seasonData);
                    } else if (permissionType === "evaluation") {
                      setPermissionEvaluation(res.data);
                      props.seasonData.permissionEvaluation = res.data;
                      props.setSelectedSeason(props.seasonData);
                    }
                  })
                  .catch((err) => {
                    alert(err.response.data.message);
                  });
              }}
            >
              수정하기
            </Button>
          </div>
        </Popup>
      )}
    </>
  );
};

export default Permission;
