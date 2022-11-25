import Divider from "components/divider/Divider";
import Autofill from "components/input/Autofill";
import Select from "components/select/Select";
import Tab from "components/tab/Tab";
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";
import Navbar from "layout/navbar/Navbar";
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

  async function getUserArchive(userId: string) {
    const result = await database.R({
      location: `archives?school=${currentSchool.school}&userId=${userId}`,
    });
    return result;
  }

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
  }, [currentSchool]);

  useEffect(() => {
    if (userId !== "") {
      getUserArchive(userId).then((res) => {
        console.log(res);
      });
    }
  }, [userId]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>{pid}</div>
        <Tab
          items={{
            "학생별 입력": (
              <One
                users={users}
                archive={pid}
                setUserId={setUserId}
                userId={userId}
              />
            ),
            "그룹별 입력": <Group />,
          }}
        ></Tab>
      </div>
    </>
  );
};

export default ArchiveField;
