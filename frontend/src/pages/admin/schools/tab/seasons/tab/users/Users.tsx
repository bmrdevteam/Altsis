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
import useDatabase from "hooks/useDatabase";
import React from "react";
import { useRef } from "react";
import { useState } from "react";
import { useEffect } from "react";

import _ from "lodash";

import Register from "./tab/Register";
import Edit from "./tab/Edit";
import EditBulk from "./tab/EditBulk";
import SelectSeason from "./tab/RegisterCopy";

type Props = {
  seasonData: any;
};
const Users = (props: Props) => {
  const database = useDatabase();
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

  async function getRegistrations() {
    const { registrations: result } = await database.R({
      location: `registrations?season=${props.seasonData._id}`,
    });
    return result;
  }
  async function deleteRegistrations() {
    const result = await database.D({
      location: `registrations/${_.join(selectedRegistrations.current, ",")}`,
    });
    return result;
  }

  useEffect(() => {
    if (isLoading) {
      getRegistrations().then((res: any) => {
        setRegistrationList(res);
        setIsLoading(false);
      });
    }
    return () => {};
  }, [isLoading]);

  return (
    <div>
      <Button
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
      </Button>

      <Button
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
          deleteRegistrations()
            .then((res: any) => {
              setIsLoading(true);
            })
            .catch((err: any) => alert(err.response.data.message));
        }}
      >
        선택된 유저 삭제 (임시)
      </Button>
      <div style={{ marginTop: "24px" }}></div>
      <>
        {!isLoading && (
          <Table
            data={registrationList}
            type="object-array"
            control
            // onSelectChange={(value: any) => {
            //   selectedRegistrations.current = value.map((val: any) => {
            //     return val._id;
            //   });
            // }}
            header={[
              {
                text: "checkbox",
                key: "",
                type: "checkbox",
                width: "48px",
              },
              {
                text: "ID",
                key: "userId",
                type: "text",
              },
              {
                text: "이름",
                key: "userName",
                type: "text",
              },
              {
                text: "역할",
                key: "role",
                type: "text",
              },

              {
                text: "학년",
                key: "grade",
                type: "text",
              },
              {
                text: "그룹",
                key: "group",
                type: "text",
              },
              {
                text: "선생님 ID",
                key: "teacherId",
                type: "text",
              },
              {
                text: "선생님 이름",
                key: "teacherName",
                type: "text",
              },
              {
                text: "수정",
                key: "_id",
                type: "button",
                onClick: (e: any) => {
                  setRegistration(e);
                  setEditPopupActive(true);
                },
                width: "72px",
                textAlign: "center",
              },
            ]}
          />
        )}
      </>
      {registerUserPopupActive && (
        <Register
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
