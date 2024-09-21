/**
 * @file Academy Users
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
import useAPIv2 from "hooks/useAPIv2";

// components
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import { useAuth } from "contexts/authContext";
import Skeleton from "components/skeleton/Skeleton";

// popup/tab elements
import EditPopup from "./popup/EditPopup/Index";
import Add from "./popup/Add";
import AddBulkPopup from "./popup/AddBulkPopup/Index";
import SchoolBulkPopup from "./popup/SchoolBulkPopup/Index";
import RemoveBulkPopup from "./popup/RemoveBulkPopup/Index";

import _ from "lodash";
import Navbar from "layout/navbar/Navbar";
import Svg from "assets/svg/Svg";
import Popup from "components/popup/Popup";

type Props = {};

const Users = (props: Props) => {
  const { UserAPI } = useAPIv2();
  const { currentUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);

  /* user list */
  const [userList, setUserList] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>({});

  const [editPopupActive, setEditPopupActive] = useState<boolean>(false);

  const [addSelectPopupActive, setAddSelectPopupActive] =
    useState<boolean>(false);
  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);
  const [addBulkPopupActive, setAddBulkPopupActive] = useState<boolean>(false);
  const [schoolBulkPopup, setSchoolBulkPopupActive] = useState<boolean>(false);
  const [removeBulkPopupActive, setRemoveBulkPopupActive] =
    useState<boolean>(false);

  const userSelectRef = useRef<any[]>([]);

  const addUserList = (users: any[]) => {
    setUserList([...userList, ...users]);
  };

  const popUserList = (_ids: any[]) => {
    setUserList(
      _.filter(userList, (user) => {
        return !_ids.find((_id) => _id === user._id);
      })
    );
  };

  useEffect(() => {
    if (isLoading) {
      UserAPI.RUsers({})
        .then(({ users }) => {
          setUserList(users);
          userSelectRef.current = [];
          setIsLoading(false);
        })
        .catch(() => {
          alert("failed to load data");
        });
    }
    return () => {};
  }, [isLoading]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>사용자</div>
        <div className={style.description}>
              {currentUser !== undefined ? (
                `${currentUser.academyName} / ${currentUser.academyId}`
              ) : (
                <Skeleton height="22px" width="20%" />
              )}
            </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            margin: "24px 12px",
          }}
        >
          <div style={{ display: "flex", gap: "12px" }}>
            <Button
              type="ghost"
              onClick={() => {
                setAddSelectPopupActive(true);
              }}
            >
              <Svg type={"userPlus"} width="28px" height="28px" />
            </Button>

            <Button
              type="ghost"
              onClick={() => {
                if (userSelectRef.current.length === 0) {
                  alert("선택된 사용자가 없습니다.");
                } else {
                  setSchoolBulkPopupActive(true);
                }
              }}
            >
              <Svg type={"institution"} width="28px" height="28px" />
            </Button>
          </div>

          <div style={{ display: "flex" }}>
            <Button
              type="ghost"
              onClick={() => {
                if (userSelectRef.current.length === 0) {
                  alert("선택된 사용자가 없습니다.");
                } else {
                  setRemoveBulkPopupActive(true);
                }
              }}
            >
              <Svg type={"userMinus"} width="28px" height="28px" />
            </Button>
          </div>
        </div>

        {!isLoading && (
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
                text: "이름",
                key: "userName",
                type: "text",
                textAlign: "center",
              },
              {
                text: "ID",
                key: "userId",
                type: "text",
                textAlign: "center",
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
                  setSelectedUser(userList[e.tableRowIndex - 1]);
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
      {editPopupActive && selectedUser?._id && (
        <EditPopup
          user={selectedUser}
          setUser={setSelectedUser}
          setPopupAcitve={setEditPopupActive}
        />
      )}
      {addSelectPopupActive && (
        <Popup
          setState={setAddSelectPopupActive}
          style={{ maxWidth: "480px", width: "100%" }}
          closeBtn
          title="사용자 생성"
          contentScroll
        >
          <div className={style.popup}>
            <Button
              type={"ghost"}
              onClick={() => {
                setAddSelectPopupActive(false);
                setAddPopupActive(true);
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                marginTop: "24px",
              }}
            >
              + 단일 사용자 생성
            </Button>
            <Button
              type={"ghost"}
              onClick={() => {
                setAddSelectPopupActive(false);
                setAddBulkPopupActive(true);
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                marginTop: "24px",
              }}
            >
              + 사용자 일괄 생성
            </Button>
          </div>
        </Popup>
      )}
      {addPopupActive && (
        <Add
          setPopupAcitve={setAddPopupActive}
          addUserList={addUserList}
          setUser={setSelectedUser}
          setEditPopupActive={setEditPopupActive}
        />
      )}
      {addBulkPopupActive && (
        <AddBulkPopup
          userList={userList}
          setPopupActive={setAddBulkPopupActive}
          setIsLoading={setIsLoading}
        />
      )}
      {schoolBulkPopup && (
        <SchoolBulkPopup
          setPopupActive={setSchoolBulkPopupActive}
          selectedUserList={userSelectRef.current}
          setIsLoading={setIsLoading}
        />
      )}
      {removeBulkPopupActive && (
        <RemoveBulkPopup
          setPopupActive={setRemoveBulkPopupActive}
          selectedUserList={userSelectRef.current}
          popUserList={popUserList}
        />
      )}
    </>
  );
};

export default Users;
