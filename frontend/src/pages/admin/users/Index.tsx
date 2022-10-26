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
import Button from "../../../components/button/Button";

import Input from "../../../components/input/Input";
import NavigationLinks from "../../../components/navigationLinks/NavigationLinks";
import Popup from "../../../components/popup/Popup";

import Select from "../../../components/select/Select";
import Table from "../../../components/table/Table";
import useDatabase from "../../../hooks/useDatabase";
import useSearch from "../../../hooks/useSearch";
import style from "../../../style/pages/admin/users.module.scss";

type Props = {};

const Users = (props: Props) => {
  const database = useDatabase();
  const [academyUsers, setAcademyUsers] = useState<any>();
  const [user, setUser] = useState<any>();
  const [userRegistrations, setUserRegistrations] = useState<any[]>();
  console.log(user);

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
    getAcademyUsers().then((res) => {
      setAcademyUsers(res);
    });
  }, []);

  const search = useSearch(academyUsers);

  return (
    <>
      <div className={style.section}>
        <NavigationLinks />
        <div className={style.title}>아카데미 유저 관리</div>
        <div className={style.filter_container}>
          <div>
            <Input
              placeholder="검색"
              onChange={(e: any) => {
                search.addFilterItem({
                  id: "search",
                  key: "userName",
                  operator: "=",
                  value: e.target.value,
                });
              }}
            />
          </div>
        </div>
        <div style={{ height: "24px" }}></div>
        <div>
          <Table
            data={search.result()}
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
                key: ["schools"],
                type: "string",
                align: "center",
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
                    academyUsers?.filter(
                      (val: any) => val._id === e.target.dataset.value
                    )[0]
                  );
                  getUserRegistrations(
                    academyUsers?.filter(
                      (val: any) => val._id === e.target.dataset.value
                    )[0].userId
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
                inputStyle="flat"
                label="이름"
                required
                defaultValue={user.userName}
              />
              <Input
                label="Id"
                required
                defaultValue={user.userId}
                inputStyle="flat"
              />
            </div>
            <div className={style.row}>
              <Input
                inputStyle="flat"
                label="이메일"
                required
                defaultValue={user.email}
              />
              <Input
                label="tel"
                required
                defaultValue={user.tel}
                inputStyle="flat"
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
  );
};

export default Users;
