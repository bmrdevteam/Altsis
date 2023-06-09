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

import style from "style/pages/admin/schools.module.scss";

// components
import { useEffect, useState } from "react";
import Table from "components/tableV2/Table";
import useAPIv2 from "hooks/useAPIv2";
import { TRegistration } from "types/registrations";

type Props = {
  userData: any;
  schoolData: any;
};

function Registrations(props: Props) {
  const { RegistrationAPI } = useAPIv2();
  const [registrationList, setRegistrationList] = useState<TRegistration[]>([]);

  useEffect(() => {
    RegistrationAPI.RRegistrations({
      query: {
        user: props.userData._id,
        school: props.schoolData._id,
      },
    }).then(({ registrations }) => {
      setRegistrationList(registrations);
    });

    return () => {};
  }, []);

  return (
    <div>
      <div className={style.popup}>
        <div style={{ marginTop: "24px" }}>
          <Table
            data={
              registrationList.map((registration: any) => {
                return {
                  ...registration,
                  teacherTxt: registration.teacherId
                    ? `${registration.teacherName}\n(${registration.teacherId})`
                    : "",
                  subTeacherTxt: registration.subTeacherId
                    ? `${registration.subTeacherName}\n(${registration.subTeacherId})`
                    : "",
                };
              }) || []
            }
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
                text: "담임",
                key: "teacherTxt",
                type: "text",
                textAlign: "center",
                whiteSpace: "pre-wrap",
              },
              {
                text: "부담임",
                key: "subTeacherTxt",
                type: "text",
                textAlign: "center",
                whiteSpace: "pre-wrap",
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
