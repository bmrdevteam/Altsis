import { archiveTestData } from "archiveTest";
import Divider from "components/divider/Divider";
import Autofill from "components/input/Autofill";
import Select from "components/select/Select";
import Tab from "components/tab/Tab";
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";
import Navbar from "layout/navbar/Navbar";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import style from "style/pages/archive.module.scss";
import Group from "./tab/Group";
import One from "./tab/One";

type Props = {};

const ArchiveField = (props: Props) => {
  const database = useDatabase();
  const { pid } = useParams();

  const { currentSchool, currentUser } = useAuth();

  const [users, setUsers] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [archiveData, setArchiveData] = useState<any>();
  const [archiveForm, setArchiveForm] = useState<any>();

  async function getUsers(schoolId: string) {
    const { users: result } = await database.R({
      location: `users?schoolId=bmrhs&role=student`,
    });
    return result;
  }

  useEffect(() => {
    getUsers(currentSchool.schoolId).then((res) => {
      setUsers(res);
    });
    database
      .R({
        location: `schools/${currentSchool.school}`,
      })
      .then((res) => {
        console.log(res);
        setArchiveForm(res);
      });
  }, [currentSchool]);

  useEffect(() => {
    if (userId !== "") {
      database
        .R({
          location: `archives?school=${currentSchool.school}&userId=${userId}`,
        })
        .then((res) => {
          setArchiveData(res.data);
        });
    }
  }, [userId]);
  console.log(archiveData);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>{pid}</div>
        <Tab
          items={{
            "학생별 입력": (
              <>
                <div className={style.search}>
                  <div className={style.label}>학생선택</div>
                  <Select
                    options={[{ text: "11학년", value: "11" }]}
                    style={{ borderRadius: "4px", maxWidth: "120px" }}
                  />
                  <Autofill
                    style={{ borderRadius: "4px" }}
                    setState={setUserId}
                    defaultValue={userId}
                    options={[
                      { text: "", value: "" },
                      ...users?.map((val) => {
                        return {
                          value: val.userId,
                          text: `${val.userName} / ${val.userId}`,
                        };
                      }),
                    ]}
                    placeholder={"검색"}
                  />
                </div>
                <Divider />
                <One
                  users={users}
                  archive={pid}
                  setUserId={setUserId}
                  userId={userId}
                  userArchiveData={archiveData?.[pid ?? ""]}
                />
              </>
            ),
            "그룹별 입력": <Group />,
          }}
        ></Tab>
      </div>
    </>
  );
};

export default ArchiveField;
