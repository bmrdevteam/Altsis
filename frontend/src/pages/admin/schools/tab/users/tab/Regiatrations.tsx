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
import Table from "components/tableV2/Table";

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
            data={registrationList || []}
            defaultPageBy={50}
            control
            type="object-array"
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
              },
              {
                text: "학년도",
                key: "year",
                type: "text",
                textAlign: "center",
              },
              {
                text: "학기",
                key: "term",
                type: "text",
                textAlign: "center",
              },
              {
                text: "역할",
                key: "role",
                type: "text",
                textAlign: "center",
              },

              {
                text: "학년",
                key: "grade",
                type: "text",
                textAlign: "center",
              },
              {
                text: "그룹",
                key: "group",
                type: "text",
                textAlign: "center",
              },
              {
                text: "선생님 ID",
                key: "teacherId",
                type: "text",
                textAlign: "center",
              },
              {
                text: "선생님 이름",
                key: "teacherName",
                type: "text",
                textAlign: "center",
              },
              {
                text: "상태",
                key: "isActivated",
                width: "120px",
                textAlign: "center",
                type: "status",
                status: {
                  false: { text: "비활성화됨", color: "red" },
                  true: { text: "활성화됨", color: "green" },
                },
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export default Registrations;
