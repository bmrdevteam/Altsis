import React, { useEffect, useState } from "react";
import { text } from "stream/consumers";
import FIleUploader from "../../../components/fileUploader/FIleUploader";
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
  const [schoolUsers, setSchoolUsers] = useState<any>();
  const [moreInfo, setMoreInfo] = useState<any>();

  const [userInfoPopupActive, setUserInfoPopupActive] =
    useState<boolean>(false);
  async function getAcademyUsers() {
    const { users: res } = await database.R({ location: "users/members" });
    return res;
  }

  async function getSchoolUsers() {
    const { schoolUsers: res } = await database.R({
      location: "schoolusers/list",
    });
    return res;
  }

  useEffect(() => {
    getAcademyUsers().then((res) => {
      setAcademyUsers(res);
    });
    getSchoolUsers().then((res) => setSchoolUsers(res));
    return () => {};
  }, []);
  console.log(academyUsers);

  const search = useSearch(academyUsers);

  return (
    <>
      <div className={style.section}>
        <NavigationLinks />
        <div className={style.title}>아카데미 유저 관리</div>
        <div className={style.filter_container}>
          <div className={style.filter}>
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
            {/* <div style={{ display: "flex" }}>
              <Select
                options={[
                  { text: "ID", value: "id" },
                  { text: "Name", value: "name" },
                  { text: "Role", value: "role" },
                ]}
              />

              <Select
                options={[
                  { text: "=", value: "=" },
                  { text: ">", value: ">" },
                ]}
              />
            </div> */}
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
                text: "자세히",
                key: "_id",
                type: "button",
                onClick: (e: any) => {
                  setMoreInfo([
                    academyUsers?.filter(
                      (val: any) => val._id === e.target.dataset.value
                    )[0],
                    schoolUsers?.filter(
                      (val: any) =>
                        val.userId ===
                        academyUsers?.filter(
                          (val: any) => val._id === e.target.dataset.value
                        )[0].userId
                    ),
                  ]);

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
        <Popup setState={setUserInfoPopupActive} title="유저 정보">
          <div className={style.popup}>
            <div
              style={{ display: "flex", gap: "12px" }}
              onClick={() => {

              }}
            >
              <Input
                label="이름"
                required
                defaultValue={moreInfo[0].userName}
              />
              <Input label="Id" required defaultValue={moreInfo[0].userId} />
            </div>
            <div>
              <Select
              label="학교"
                options={Array.from(
                  moreInfo[1].map((value: any, index: number) => {
                    return { text: value.schoolName, value: index };
                  })
                )}
              />
            </div>
          </div>
        </Popup>
      )}
    </>
  );
};

export default Users;
