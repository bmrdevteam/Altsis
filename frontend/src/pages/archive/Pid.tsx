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
  const { pid } = useParams();
  const { currentSchool } = useAuth();
  const database = useDatabase();

  const [users, setUsers] = useState<any[]>([]);

  async function getUsers(schoolId: string) {
    const { users: result } = await database.R({
      location: `users?schoolId=hs&role=teacher`,
    });
    return result;
  }

  useEffect(() => {
    getUsers(currentSchool.schoolId).then((res) => {
      setUsers(res);
    });
  }, [currentSchool]);
console.log(users);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>{pid}</div>
        <Tab
          items={{
            "학생별 입력": <One users={users} />,
            "그룹별 입력": <Group />,
          }}
        />
      </div>
    </>
  );
};

export default ArchiveField;
