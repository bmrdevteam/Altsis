/**
 * @file Users Page
 * viewing academy Users
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

import { useEffect, useState, useRef } from "react";

// style
import style from "style/pages/admin/schools.module.scss";

// hooks
import useApi from "hooks/useApi";

// components
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import Select from "components/select/Select";

// popup/tab elements
import Basic from "./tab/Basic";
import Add from "./tab/Add";
import AddBulk from "./tab/AddBulk";
import SchoolBulk from "./tab/SchoolBulk";
import _ from "lodash";
import Navbar from "layout/navbar/Navbar";
import Input from "components/input/Input";

type Props = {};

const Users = (props: Props) => {
  const { UserApi, SchoolApi } = useApi();
  const [isSchoolListLoading, setIsSchoolListLoading] = useState(true);
  const [isUserListLoading, setIsUserListLoading] = useState(true);

  /* user list */
  const [userList, setUserList] = useState<any[]>([]);
  const [user, setUser] = useState<string>();

  /* school list */
  const [schoolList, setSchoolList] = useState<any>();

  const [editPopupActive, setEditPopupActive] = useState<boolean>(false);
  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);
  const [addBulkPopupActive, setAddBulkPopupActive] = useState<boolean>(false);
  const [schoolBulkPopup, setSchoolBulkPopupActive] = useState<boolean>(false);
  const userSelectRef = useRef<any[]>([]);

  const updateUserList = (userId: string, userData: any) => {
    const idx = _.findIndex(userList, { userId });
    userList[idx] = userData;
  };

  const addUserList = (users: any[]) => {
    users.forEach((user) => userList.push(user));
  };

  const popUserList = (_ids: any[]) => {
    setUserList(
      _.filter(userList, (user) => {
        return !_ids.find((_id) => _id === user._id);
      })
    );
  };

  useEffect(() => {
    if (isSchoolListLoading) {
      SchoolApi.RSchools()
        .then((res) => {
          setSchoolList(res);
          setIsSchoolListLoading(false);
          setIsUserListLoading(true);
        })
        .catch(() => {
          alert("failed to load data");
        });
    }
    return () => {};
  }, [isSchoolListLoading]);
  useEffect(() => {
    if (isUserListLoading) {
      UserApi.RUsers({})
        .then((res) => {
          // console.log(res);
          setUserList(res);
          userSelectRef.current = [];
          setIsUserListLoading(false);
        })
        .catch(() => {
          alert("failed to load data");
        });
    }
    return () => {};
  }, [isUserListLoading]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>아카데미 사용자 관리</div>

        <Button
          type={"ghost"}
          style={{
            borderRadius: "4px",
            height: "32px",
            margin: "24px 0",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
          onClick={async () => {
            setAddPopupActive(true);
          }}
        >
          + 단일 사용자 생성
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
            setAddBulkPopupActive(true);
          }}
        >
          + 사용자 일괄 생성
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
            // console.log("userSelectRef.current is ", userSelectRef.current);
            if (userSelectRef.current.length === 0) {
              alert("선택된 사용자가 없습니다.");
            } else {
              const _ids = _.filter(
                userSelectRef.current,
                (user) => user.auth !== "admin"
              ).map((user) => user._id);
              UserApi.DUsers({ _ids })
                .then(() => {
                  alert("성공적으로 처리되었습니다. 😘💌");
                  userSelectRef.current = [];
                  popUserList(_ids);
                })
                .catch((err) => alert(err.response.data.message));
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
            // console.log("userSelectRef.current is ", userSelectRef.current);
            if (userSelectRef.current.length === 0) {
              alert("선택된 사용자가 없습니다.");
            } else {
              setSchoolBulkPopupActive(true);
            }
          }}
        >
          선택된 사용자 학교 설정
        </Button>

        {!isUserListLoading && (
          <Table
            type="object-array"
            control
            data={
              userList.map((user: any) => {
                return {
                  ...user,
                  schoolsText:
                    user.schools.length > 0
                      ? _.join(
                          user.schools?.map((school: any) => school.schoolName),
                          "\n"
                        )
                      : "",
                };
              }) || []
            }
            defaultPageBy={50}
            onChange={(value: any[]) => {
              userSelectRef.current = _.filter(value, {
                tableRowChecked: true,
              });
            }}
            header={[
              {
                text: "",
                key: "checkbox",
                type: "checkbox",
                width: "48px",
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
                text: "등급",
                key: "auth",
                textAlign: "center",
                type: "status",
                fontSize: "12px",
                fontWeight: "600",
                status: {
                  admin: { text: "관리자", color: "red" },
                  manager: { text: "매니저", color: "violet" },
                  member: { text: "멤버", color: "gray" },
                },
                width: "100px",
              },
              {
                text: "학교",
                key: "schoolsText",
                textAlign: "center",
                type: "text",
                whiteSpace: "pre",
              },
              {
                text: "자세히",
                type: "button",
                onClick: (e: any) => {
                  setUser(e._id);
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
      </div>
      {editPopupActive && user && (
        <Basic
          user={user}
          schoolList={schoolList}
          setPopupAcitve={setEditPopupActive}
          updateUserList={updateUserList}
        />
      )}
      {addPopupActive && (
        <Add
          schoolList={schoolList}
          setPopupAcitve={setAddPopupActive}
          addUserList={addUserList}
        />
      )}
      {addBulkPopupActive && (
        <AddBulk
          schoolList={schoolList}
          setPopupActive={setAddBulkPopupActive}
          addUserList={addUserList}
        />
      )}
      {schoolBulkPopup && (
        <SchoolBulk
          schoolList={schoolList}
          setPopupActive={setSchoolBulkPopupActive}
          updateUserList={updateUserList}
          selectedUserList={userSelectRef.current}
        />
      )}
    </>
  );
};

export default Users;
