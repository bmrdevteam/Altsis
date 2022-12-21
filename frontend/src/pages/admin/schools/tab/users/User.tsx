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
import Table from "components/table/Table";
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
        <Button
          type={"ghost"}
          style={{
            borderRadius: "4px",
            height: "32px",
            margin: "24px 0",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
          onClick={async () => {
            console.log("userSelectRef.current is ", userSelectRef.current);
            if (userSelectRef.current.length === 0) {
              alert("선택된 사용자가 없습니다.");
            } else {
              //   deleteUsers()
              //     .then((res: any) => {
              //       alert("success");
              //       userSelectRef.current = [];
              //       setIsUserListLoading(true);
              //     })
              //     .catch((err) => alert(err.response.data.message));
            }
          }}
        >
          선택된 사용자 삭제
        </Button>

        <Button
          type={"ghost"}
          style={{
            borderRadius: "4px",
            height: "32px",
            margin: "24px 0",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
          onClick={async () => {
            console.log("userSelectRef.current is ", userSelectRef.current);
            if (userSelectRef.current.length === 0) {
              alert("선택된 사용자가 없습니다.");
            } else {
              setSchoolBulkPopupActive(true);
            }
          }}
        >
          선택된 사용자 학교 설정
        </Button>

        <div>
          <Table
            type="object-array"
            filter
            filterSearch
            data={userList}
            onSelectChange={(value) => {
              userSelectRef.current = value;
            }}
            header={[
              {
                text: "",
                key: "",
                type: "checkbox",
                width: "48px",
                align: "center",
              },
              {
                text: "id",
                key: "",
                type: "index",
                width: "48px",
                align: "center",
              },
              {
                text: "이름",
                key: "userName",
                type: "string",
                align: "center",
              },
              { text: "Id", key: "userId", type: "string", align: "center" },
              {
                text: "학교",
                key: "schools",
                type: "string",
                align: "center",
                returnFunction: (val) =>
                  _.join(
                    val.map((school: any) => school.schoolName),
                    ", "
                  ),
              },
              {
                text: "auth",
                key: "auth",
                type: "string",
                align: "center",
              },
              {
                text: "자세히",
                key: "_id",
                type: "button",
                onClick: (e: any) => {
                  setUser(e);
                  setEditPopupActive(true);
                  console.log(e);
                },
                width: "72px",
                align: "center",
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
            align={"flex-start"}
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
