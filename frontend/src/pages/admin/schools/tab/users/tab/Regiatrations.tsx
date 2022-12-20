/**
 * @file User Page Tab Item - Basic
 *
 * @author jessie129j <jessie129j@gmail.com>
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

import useDatabase from "hooks/useDatabase";

import style from "style/pages/admin/schools.module.scss";

// components
import Input from "components/input/Input";
import { useEffect, useState } from "react";
import Table from "components/table/Table";

type Props = {
  userData: any;
  setIsUserListLoading: any;
};

function Registrations(props: Props) {
  const database = useDatabase();
  const [registrationList, setRegistrationList] = useState<any[]>([]);
  const [registration, setRegistration] = useState<any>();

  // popup activation
  const [editPopupActive, setEditPopupActive] = useState<boolean>(false);

  async function getRegistrationList() {
    const { registrations } = await database.R({
      location: `registrations?userId=${props.userData.userId}`,
    });

    return registrations;
  }

  useEffect(() => {
    getRegistrationList().then((res: any) => {
      setRegistrationList(res);
      console.log("res is ", res);
    });

    return () => {};
  }, []);

  return (
    <div>
      <div className={style.popup}>
        <div style={{ marginTop: "24px" }}>
          <Table
            data={registrationList}
            type="object-array"
            header={[
              {
                text: "No",
                key: "",
                type: "index",
                width: "48px",
                align: "center",
              },
              {
                text: "학년도",
                key: "year",
                type: "string",
              },
              {
                text: "학기",
                key: "term",
                type: "string",
              },
              {
                text: "역할",
                key: "role",
                type: "string",
              },

              {
                text: "학년",
                key: "grade",
                type: "string",
              },
              {
                text: "그룹",
                key: "group",
                type: "string",
              },
              {
                text: "선생님 Id",
                key: "teacherId",
                type: "string",
              },
              {
                text: "선생님 이름",
                key: "teacherName",
                type: "string",
              },
              {
                text: "활성화",
                key: "isActivated",
                type: "string",
                returnFunction: (e) => (e ? "활성화됨" : "비활성화됨"),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export default Registrations;
