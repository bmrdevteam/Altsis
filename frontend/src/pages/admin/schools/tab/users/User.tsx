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
import useApi from "hooks/useApi";

// components
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";
import Tab from "components/tab/Tab";

// popup/tab elements
import Basic from "./tab/Basic";
import Registrations from "./tab/Regiatrations";

import _ from "lodash";

type Props = { schoolData: any };

const Users = (props: Props) => {
  const { UserApi } = useApi();

  const [isUserListLoading, setIsUserListLoading] = useState(true);

  /* user list */
  const [userList, setUserList] = useState<any>();
  const [user, setUser] = useState<any>();

  /* school list */

  const [viewPopupActive, setViewPopupActive] = useState<boolean>(false);
  const userSelectRef = useRef<any[]>([]);

  useEffect(() => {
    if (isUserListLoading) {
      UserApi.RUsers({ school: props.schoolData._id })
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
                  setViewPopupActive(true);
                  console.log(e);
                },
                width: "72px",
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
        </div>
      </div>
      {viewPopupActive && (
        <Popup
          setState={setViewPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
          closeBtn
          title={`${user.userName}(${user.userId})`}
          contentScroll
        >
          <Tab
            dontUsePaths
            items={{
              "기본 정보": <Basic userData={user} />,
              "등록 정보": (
                <Registrations userData={user} schoolData={props.schoolData} />
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
