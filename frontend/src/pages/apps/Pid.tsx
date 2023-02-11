import { Apps } from "apps";
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
import style from "style/pages/apps/apps.module.scss";

type Props = {};

const AppsField = (props: Props) => {
  // const database = useDatabase();
  const { pid } = useParams();

  // const { currentSchool, currentUser } = useAuth();

  // const [users, setUsers] = useState<any[]>([]);
  // const [userId, setUserId] = useState<string>("");
  // const [appsData, setAppsData] = useState<any>();

  // async function getUsers(schoolId: string) {
  //   const { registrations: result } = await database.R({
  //     location: `registrations?schoolId=bmrhs&role=student`,
  //   });
  //   // console.log(result);

  //   return result;
  // }

  // useEffect(() => {
  //   if (userId !== "") {
  //     database
  //       .R({
  //         location: `appss?school=${currentSchool.school}&userId=${userId}`,
  //       })
  //       .then((res) => {
  //         setAppsData(res.data);
  //       });
  //   }
  // }, [userId]);
  // // console.log(appsData);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>{pid}</div>
      </div>
    </>
  );
};

export default AppsField;
