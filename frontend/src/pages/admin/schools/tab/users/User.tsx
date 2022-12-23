/**
 * @file Schools Pid Page Tab Item - User
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

import { useEffect, useState, useRef } from "react";

// style
import style from "style/pages/admin/users.module.scss";

// hooks
import useDatabase from "hooks/useDatabase";

// components
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Button from "components/button/Button";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";
import Select from "components/select/Select";

// popup/tab elements
import Basic from "./tab/Basic";
// import Add from "./tab/Add";
// import AddBulk from "./tab/AddBulk";
// import SchoolBulk from "./tab/SchoolBulk";
import _ from "lodash";
import Tab from "components/tab/Tab";
import Registrations from "./tab/Regiatrations";

type Props = { schoolData: any };

const Users = (props: Props) => {
  const database = useDatabase();

  const [isUserListLoading, setIsUserListLoading] = useState(true);

  /* user list */
  const [userList, setUserList] = useState<any>();
  const [user, setUser] = useState<any>();

  /* school list */

  const [editPopupActive, setEditPopupActive] = useState<boolean>(false);
  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);
  const [addBulkPopupActive, setAddBulkPopupActive] = useState<boolean>(false);
  const [schoolBulkPopup, setSchoolBulkPopupActive] = useState<boolean>(false);
  const userSelectRef = useRef<any[]>([]);

  async function getSchoolUsers() {
    const { users: res } = await database.R({
      location: `users?schools.school=${props.schoolData._id}`,
    });
    return res;
  }

  useEffect(() => {
    if (isUserListLoading) {
      getSchoolUsers()
        .then((res) => {
          setUserList(res);
          setIsUserListLoading(false);
          userSelectRef.current = [];
        })
        .catch(() => {
          alert("failed to load data");
        });
    }
    return () => {};
  }, [isUserListLoading]);

  return (
    <>
      <div className={style.section}>
        <div>
          <Table
            type="object-array"
            control
            data={userList || []}
            defaultPageBy={50}
            // onSelectChange={(value) => {
            //   userSelectRef.current = value;
            // }}
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
              },

              { text: "ID", key: "userId", type: "text", textAlign: "center" },

              {
                text: "이름",
                key: "userName",
                type: "text",
                textAlign: "center",
              },

              {
                text: "등급",
                key: "auth",
                textAlign: "center",
                type: "status",
                status: {
                  admin: { text: "관리자", color: "red" },
                  manager: { text: "매니저", color: "purple" },
                  member: { text: "멤버", color: "gray" },
                },
                width: "100px",
              },
              {
                text: "자세히",
                key: "detail",
                type: "button",
                onClick: (e: any) => {
                  setUser(e);
                  setEditPopupActive(true);
                  console.log(e);
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
        </div>
      </div>
      {editPopupActive && (
        <Popup
          setState={setEditPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
          closeBtn
          title={`${user.userName}(${user.userId})`}
          contentScroll
        >
          <Tab
            dontUsePaths
            items={{
              "기본 정보": (
                <Basic
                  userData={user}
                  setIsUserListLoading={setIsUserListLoading}
                />
              ),
              "등록 정보": (
                <Registrations
                  userData={user}
                  setIsUserListLoading={setIsUserListLoading}
                />
              ),
            }}
          />
        </Popup>
      )}
      {/*
      {addPopupActive && (
        <Add
          schoolData={school}
          schoolList={schoolList}
          setPopupAcitve={setAddPopupActive}
          setIsUserListLoading={setIsUserListLoading}
        />
      )}
      {addBulkPopupActive && (
        <AddBulk
          schoolData={school}
          schoolList={schoolList}
          setPopupActive={setAddBulkPopupActive}
          setIsUserListLoading={setIsUserListLoading}
        />
      )}
      {schoolBulkPopup && (
        <SchoolBulk
          schoolList={schoolList}
          setPopupActive={setSchoolBulkPopupActive}
          setIsUserListLoading={setIsUserListLoading}
          selectedUserList={userSelectRef.current}
        />
      )} */}
    </>
  );
};

export default Users;
