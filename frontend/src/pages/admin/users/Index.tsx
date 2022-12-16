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
import Add from "./tab/Add";
import AddBulk from "./tab/AddBulk";
import SchoolBulk from "./tab/SchoolBulk";
import _ from "lodash";

type Props = {};

const Users = (props: Props) => {
  const database = useDatabase();
  const [isSchoolListLoading, setIsSchoolListLoading] = useState(true);
  const [isUserListLoading, setIsUserListLoading] = useState(false);

  /* user list */
  const [userList, setUserList] = useState<any>();
  const [user, setUser] = useState<any>();

  /* school list */
  const [schoolList, setSchoolList] = useState<any>();
  const [school, setSchool] = useState<any>();

  const [editPopupActive, setEditPopupActive] = useState<boolean>(false);
  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);
  const [addBulkPopupActive, setAddBulkPopupActive] = useState<boolean>(false);
  const [schoolBulkPopup, setSchoolBulkPopupActive] = useState<boolean>(false);
  const userSelectRef = useRef<any[]>([]);

  async function getAcademyUsers() {
    const { users: res } = await database.R({
      location: `users?${
        school?._id ? `schools.school=${school._id}` : `no-school=true`
      }`,
    });
    return _.filter(res, (user) => user.auth !== "admin");
  }

  const schools = () => {
    let result: { text: string; value: string }[] = [{ text: "", value: "" }];

    for (let i = 0; i < schoolList?.length; i++) {
      result.push({
        text: `${schoolList[i].schoolName}(${schoolList[i].schoolId})`,
        value: JSON.stringify(schoolList[i]),
      });
    }
    return result;
  };

  async function getSchoolList() {
    const { schools } = await database.R({
      location: `schools`,
    });
    return schools;
  }

  async function deleteUsers() {
    const res = await database.D({
      location: `users/${_.join(
        userSelectRef.current.map((user) => user._id),
        "&"
      )}`,
    });
    return res;
  }

  useEffect(() => {
    if (isSchoolListLoading) {
      getSchoolList()
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
      getAcademyUsers()
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
        <NavigationLinks />
        <div className={style.title}>아카데미 사용자 관리</div>
        <div style={{ height: "24px" }}></div>
        <Select
          style={{ minHeight: "30px" }}
          required
          label={"학교 선택"}
          options={!isSchoolListLoading ? schools() : [{ text: "", value: "" }]}
          setValue={(e: string) => {
            setSchool(e ? JSON.parse(e) : {});
            setIsUserListLoading(true);
          }}
          appearence={"flat"}
        />
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
            console.log("userSelectRef.current is ", userSelectRef.current);
            if (userSelectRef.current.length === 0) {
              alert("선택된 사용자가 없습니다.");
            } else {
              deleteUsers()
                .then((res: any) => {
                  alert("success");
                  userSelectRef.current = [];
                  setIsUserListLoading(true);
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
              { text: "이름", key: "userName", type: "string", align: "right" },
              { text: "Id", key: "userId", type: "string" },
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
                },
                width: "72px",
                align: "center",
              },
            ]}
          />
        </div>
      </div>
      {editPopupActive && (
        <Basic
          userData={user}
          schoolList={schoolList}
          setPopupAcitve={setEditPopupActive}
          setIsUserListLoading={setIsUserListLoading}
        />
      )}
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
      )}
    </>
  );
};

export default Users;
