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

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";

// style
import style from "style/pages/admin/users.module.scss";

// hooks
import useDatabase from "hooks/useDatabase";
import useSearch from "hooks/useSearch";

// Navigation Links
import NavigationLinks from "components/navigationLinks/NavigationLinks";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";
import Select from "components/select/Select";
import Table from "components/table/Table";

type Props = {};

const Users = (props: Props) => {
  const database = useDatabase();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [academyUsers, setAcademyUsers] = useState<any>();
  const [user, setUser] = useState<any>();
  const [userRegistrations, setUserRegistrations] = useState<any[]>();

  const [userInfoPopupActive, setUserInfoPopupActive] =
    useState<boolean>(false);
  async function getAcademyUsers() {
    const { users: res } = await database.R({ location: "users" });
    return res;
  }
  async function getUserRegistrations(id: string) {
    const res = await database.R({ location: `registrations?userId=${id}` });
    return res;
  }

  useEffect(() => {
    if (isLoading) {
      getAcademyUsers()
        .then((res) => {
          setAcademyUsers(res);
          setIsLoading(false);
        })
        .catch((err) => {
          alert(err.response.data.message);
        });
    }
  }, [isLoading]);

  useEffect(() => {
    if (currentUser.auth !== "admin") {
      alert("접근 권한이 없습니다.");
      navigate("/");
    } else {
      setIsAuthenticated(true);
      setIsLoading(true);
    }
  }, [currentUser]);

  return isAuthenticated ? (
    <>
      <div className={style.section}>
        <NavigationLinks />
        <div className={style.title}>아카데미 유저 관리</div>
        <div style={{ height: "24px" }}></div>
        <div>
          <Table
            type="object-array"
            filter
            filterSearch
            data={academyUsers}
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
              { text: "이름", key: "userName", type: "string", align: "right" },
              { text: "Id", key: "userId", type: "string" },
              {
                text: "학교",
                key: "schools",
                type: "string",
                align: "center",
                returnFunction: (val) => {
                  let result = "";

                  for (let i = 0; i < val.length; i++) {
                    result = result.concat(val[i].schoolName);
                    if (i >= 1) {
                      result = result.concat(",");
                    }
                  }
                  return result;
                },
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
                  setUser(
                    academyUsers?.filter((val: any) => val._id === e._id)[0]
                  );
                  getUserRegistrations(
                    academyUsers?.filter((val: any) => val._id === e._id)[0]
                      .userId
                  ).then((res) => {
                    setUserRegistrations(res);
                  });
                  setUserInfoPopupActive(true);
                },
                width: "72px",
                align: "center",
              },
            ]}
          />
        </div>
      </div>
      {userInfoPopupActive && (
        <Popup
          closeBtn
          setState={setUserInfoPopupActive}
          title="유저 정보"
          style={{ borderRadius: "4px" }}
        >
          <div className={style.popup}>
            <div className={style.title}>기본 정보</div>
            <div className={style.row}>
              <Input
                appearence="flat"
                label="이름"
                required
                defaultValue={user.userName}
              />
              <Input
                label="Id"
                required
                defaultValue={user.userId}
                appearence="flat"
              />
            </div>
            <div className={style.row}>
              <Input
                appearence="flat"
                label="이메일"
                required
                defaultValue={user.email}
              />
              <Input
                label="tel"
                required
                defaultValue={user.tel}
                appearence="flat"
              />
            </div>
            <Button
              type={"ghost"}
              disableOnclick
              onClick={() => {}}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              }}
            >
              저장
            </Button>
          </div>
        </Popup>
      )}
    </>
  ) : (
    <></>
  );
};

export default Users;
