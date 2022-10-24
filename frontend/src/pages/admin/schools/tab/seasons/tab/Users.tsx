import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Table from "components/table/Table";
import useDatabase from "hooks/useDatabase";
import React from "react";
import { useState } from "react";
import { useEffect } from "react";

type Props = {
  seasonData: any;
};
const Users = (props: Props) => {
  const database = useDatabase();
  const [registrations, setRegistrations] = useState<any>();
  const [schoolUsers, setSchoolUsers] = useState<any>();
  console.log(schoolUsers);

  const [registerUserPopupActive, setRegisterUserPopupActive] =
    useState<boolean>(false);

  async function getRegistrations() {
    const { registrations: result } = await database.R({
      location: `registrations?schoolId=${props.seasonData.schoolId}`,
    });
    return result;
  }
  async function getSchoolUsers() {
    const { users: result } = await database.R({
      location: `users?schoolId=${props.seasonData.schoolId}`,
    });
    return result;
  }

  useEffect(() => {
    getRegistrations().then((res) => {
      setRegistrations(res);
    });
    getSchoolUsers().then((res) => {
      setSchoolUsers(res);
    });
  }, []);

  return (
    <div>
      <Button
        type={"ghost"}
        styles={{
          margin: "24px 0",
        }}
        onClick={() => {
          setRegisterUserPopupActive(true);
        }}
      >
       학기에 유저 등록
      </Button>
      <Table
        data={registrations}
        header={[
          {
            text: "ID",
            key: "",
            type: "index",
            width: "48px",
            align: "center",
          },
          {
            text: "사용자 ID",
            key: "userId",
            type: "string",
          },
          {
            text: "사용자 이름",
            key: "userName",
            type: "string",
          },
          {
            text: "삭제",
            key: "index",
            type: "button",
            onClick: (e: any) => {},
            width: "80px",
            align: "center",
            textStyle: {
              padding: "0 10px",
              border: "var(--border-default)",
              background: "rgba(255, 200, 200, 0.25)",
              borderColor: "rgba(255, 200, 200)",
            },
          },
        ]}
      />
      {registerUserPopupActive && (
        <Popup
          title="사용자 등록"
          setState={setRegisterUserPopupActive}
          style={{ borderRadius: "4px", maxWidth: "800px", width: "100%" }}
          closeBtn
          footer={
            <Button
              type={"ghost"}
              onClick={() => {
                setRegisterUserPopupActive(true);
              }}
            >
              + 학기에 유저 등록
            </Button>
          }
        >
          <div style={{ height: "100%" }}>
            <Table
              filter
              filterSearch
              data={schoolUsers}
              header={[
                {
                  text: "ID",
                  key: "",
                  type: "checkbox",
                  width: "48px",
                  align: "center",
                },
                {
                  text: "사용자 이름",
                  key: "userName",
                  type: "string",
                  align: "left",
                },
                {
                  text: "사용자 ID",
                  key: "userId",
                  type: "string",
                  align: "left",
                },
              ]}
            />
          </div>
        </Popup>
      )}
    </div>
  );
};

export default Users;
