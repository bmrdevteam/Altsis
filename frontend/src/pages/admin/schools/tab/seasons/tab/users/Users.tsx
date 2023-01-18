/**
 * @file Seasons Page Tab Item - Users
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
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
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";
import { useRef } from "react";
import { useState } from "react";
import { useEffect } from "react";
import useApi from "hooks/useApi";

import _ from "lodash";

import Register from "./tab/Register";
import Register2 from "./tab/Register2";
import Edit from "./tab/Edit";
import EditBulk from "./tab/EditBulk";
import SelectSeason from "./tab/RegisterCopy";
import Svg from "assets/svg/Svg";
import style from "style/pages/admin/schools.module.scss";

type Props = {
  seasonData: any;
};
const Users = (props: Props) => {
  const { RegistrationApi } = useApi();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [registrationList, setRegistrationList] = useState<any>();
  const [registration, setRegistration] = useState<any>();
  const selectedRegistrations = useRef<any>([]);

  const [registerUserPopupActive, setRegisterUserPopupActive] =
    useState<boolean>(false);
  const [registerCopyPopupActive, setRegisterCopyPopupActive] =
    useState<boolean>(false);
  const [editPopupActive, setEditPopupActive] = useState<boolean>(false);
  const [editBulkPopupActive, setEditBulkPopupActive] =
    useState<boolean>(false);

  useEffect(() => {
    if (isLoading) {
      RegistrationApi.RRegistrations({ season: props.seasonData._id }).then(
        (res: any) => {
          setRegistrationList(res);
          setIsLoading(false);
        }
      );
    }
    return () => {};
  }, [isLoading]);

  return (
    <div>
      {/* <Button
        type={"ghost"}
        style={{
          marginTop: "24px",
        }}
        onClick={() => {
          setRegisterUserPopupActive(true);
        }}
      >
        학기에 유저 등록
      </Button>

      <Button
        type={"ghost"}
        style={{
          marginTop: "12px",
        }}
        onClick={() => {
          if (registrationList.length !== 0) {
            alert("이미 등록된 사용자가 있습니다.");
          } else {
            setRegisterCopyPopupActive(true);
          }
        }}
      >
        이전 학기 등록 정보 불러오기
      </Button> */}

      {/* <Button
        type={"ghost"}
        style={{
          marginTop: "12px",
        }}
        onClick={() => {
          setEditBulkPopupActive(true);
        }}
      >
        선택된 유저 일괄 수정
      </Button>

      <Button
        type={"ghost"}
        style={{
          marginTop: "12px",
        }}
        onClick={() => {
          RegistrationApi.DRegistrations({
            _ids: selectedRegistrations.current,
          })
            .then(() => {
              alert("success");
              setIsLoading(true);
            })
            .catch((err: any) => alert(err.response.data.message));
        }}
      >
        선택된 유저 일괄 삭제
      </Button> */}

      <div
        className={style.table_header}
        style={{
          display: "flex",
          marginTop: "24px",
          marginLeft: "12px",
          marginRight: "12px",
        }}
      >
        <div
          style={{
            flex: "auto",

            display: "flex",
            gap: "12px",
          }}
        >
          <div
            className={style.icon}
            onClick={() => {
              setRegisterUserPopupActive(true);
            }}
            style={{ display: "flex", gap: "4px" }}
          >
            <Svg type="userPlus" width="20px" height="20px" />
            사용자 등록
          </div>
          {registrationList?.length === 0 && (
            <div
              className={style.icon}
              onClick={() => {
                setRegisterCopyPopupActive(true);
              }}
              style={{ display: "flex", gap: "4px" }}
            >
              <Svg type="arrowToBottom" width="20px" height="20px" />
              이전 학기 등록 정보 불러오기
            </div>
          )}
        </div>
        <div
          style={{
            flex: "auto",
            marginRight: "12px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <div
            className={style.icon}
            onClick={() => {
              if (_.isEmpty(selectedRegistrations?.current)) {
                alert("선택된 사용자가 없습니다.");
              } else {
                setEditBulkPopupActive(true);
              }
            }}
            style={{ display: "flex", gap: "4px" }}
          >
            <Svg type="edit" width="20px" height="20px" />
            일괄 수정
          </div>
        </div>

        <div
          className={style.icon}
          onClick={() => {
            if (_.isEmpty(selectedRegistrations.current)) {
              alert("선택된 사용자가 없습니다.");
            } else {
              RegistrationApi.DRegistrations({
                _ids: selectedRegistrations.current,
              })
                .then(() => {
                  alert("success");
                  setIsLoading(true);
                })
                .catch((err: any) => alert(err.response.data.message));
            }
          }}
          style={{ display: "flex", gap: "4px" }}
        >
          <Svg type="trash" width="20px" height="20px" />
          일괄 삭제
        </div>
      </div>

      <div style={{ marginTop: "24px" }}></div>
      <>
        {!isLoading && (
          <Table
            data={registrationList.map((registration: any) => {
              return {
                ...registration,
                teacherTxt: registration.teacherId
                  ? `${registration.teacherName}\n(${registration.teacherId})`
                  : "",
                subTeacherTxt: registration.subTeacherId
                  ? `${registration.subTeacherName}\n(${registration.subTeacherId})`
                  : "",
              };
            })}
            type="object-array"
            control
            onChange={(value: any[]) => {
              selectedRegistrations.current = _.filter(value, {
                tableRowChecked: true,
              }).map((val: any) => val._id);
            }}
            header={[
              {
                text: "checkbox",
                key: "",
                type: "checkbox",
                width: "48px",
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
                width: "84px",
              },
              {
                text: "ID",
                key: "userId",
                type: "text",
                textAlign: "center",
                whiteSpace: "pre",
              },
              {
                text: "이름",
                key: "userName",
                type: "text",
                textAlign: "center",
                whiteSpace: "pre",
              },

              {
                text: "학년",
                key: "grade",
                type: "text",
                textAlign: "center",
                whiteSpace: "pre",
              },
              {
                text: "그룹",
                key: "group",
                type: "text",
                textAlign: "center",
              },
              {
                text: "담임 선생님",
                key: "teacherTxt",
                type: "text",
                textAlign: "center",
                whiteSpace: "pre-wrap",
              },
              {
                text: "부담임 선생님",
                key: "subTeacherTxt",
                type: "text",
                textAlign: "center",
                whiteSpace: "pre-wrap",
              },
              {
                text: "수정",
                key: "edit",
                type: "button",
                onClick: (e: any) => {
                  setRegistration(e);
                  setEditPopupActive(true);
                },
                width: "72px",
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
        )}
      </>
      {registerUserPopupActive && (
        <Register2
          setPopupActive={setRegisterUserPopupActive}
          seasonData={props.seasonData}
          setIsLoading={setIsLoading}
          registrationList={registrationList}
        />
      )}
      {editPopupActive && (
        <Edit
          setPopupActive={setEditPopupActive}
          registrationData={registration}
          setIsLoading={setIsLoading}
          registrationList={registrationList}
        />
      )}
      {editBulkPopupActive && (
        <EditBulk
          setPopupActive={setEditBulkPopupActive}
          setIsLoading={setIsLoading}
          registrationList={registrationList}
          selectedRegistrationList={selectedRegistrations.current}
        />
      )}
      {registerCopyPopupActive && (
        <SelectSeason
          setPopupActive={setRegisterCopyPopupActive}
          seasonData={props.seasonData}
          setIsLoading={setIsLoading}
        />
      )}
    </div>
  );
};

export default Users;
