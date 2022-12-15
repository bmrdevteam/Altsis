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

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";

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

type Props = {};

const Users = (props: Props) => {
  const database = useDatabase();
  const [isSchoolListLoading, setIsSchoolListLoading] = useState(true);
  const [isUserLoading, setIsUserLoading] = useState(false);

  /* user list */
  const [userList, setUserList] = useState<any>();
  const [user, setUser] = useState<any>();

  /* additional document list */
  const [schoolList, setSchoolList] = useState<any>();
  const [school, setSchool] = useState<any>();
  const [schoolVal, setSchoolVal] = useState<any>();
  const [userRegistrations, setUserRegistrations] = useState<any[]>();

  const [editPopupActive, setUserInfoPopupActive] = useState<boolean>(false);
  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);
  const [addBulkPopup, setAddBulkPopup] = useState<boolean>(false);

  async function getAcademyUsers() {
    const { users: res } = await database.R({
      location: `users?${
        school?._id ? `schools.school=${school._id}` : `no-school=true`
      }`,
    });
    return res;
  }
  async function getUserRegistrations(id: string) {
    const res = await database.R({ location: `registrations?userId=${id}` });
    return res;
  }

  const schools = () => {
    let result: { text: string; value: string }[] = [{ text: "", value: "" }];

    for (let i = 0; i < schoolList?.length; i++) {
      result.push({
        text: `${schoolList[i].schoolName}(${schoolList[i].schoolId})`,
        value: JSON.stringify(schoolList[i]),
      });
    }

    console.log(result);
    return result;
  };

  async function getSchoolList() {
    const { schools } = await database.R({
      location: `schools`,
    });
    return schools;
  }

  useEffect(() => {
    if (isSchoolListLoading) {
      getSchoolList()
        .then((res) => {
          setSchoolList(res);
          setIsSchoolListLoading(false);
          setIsUserLoading(true);
        })
        .catch(() => {
          alert("failed to load data");
        });
    }
    return () => {};
  }, [isSchoolListLoading]);

  useEffect(() => {
    if (isUserLoading) {
      getAcademyUsers()
        .then((res) => {
          setUserList(res);
          setIsUserLoading(false);
        })
        .catch(() => {
          alert("failed to load data");
        });
    }
    return () => {};
  }, [isUserLoading]);

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
            setIsUserLoading(true);
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
          + 사용자 생성
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
            setAddBulkPopup(true);
          }}
        >
          + 사용자 일괄 생성
        </Button>
        <div>
          <Table
            type="object-array"
            filter
            filterSearch
            data={userList}
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
                  setUser(userList?.filter((val: any) => val._id === e._id)[0]);
                  getUserRegistrations(
                    userList?.filter((val: any) => val._id === e._id)[0].userId
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
      {editPopupActive && (
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
      {addPopupActive && (
        <Popup
          setState={setAddPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
          closeBtn
          title="Creaet Document"
        >
          <Add school={school} />
        </Popup>
      )}
      {addBulkPopup && (
        <AddBulk schoolList={schoolList} setAddBulkPopup={setAddBulkPopup} />
      )}
    </>
  );
};

export default Users;
