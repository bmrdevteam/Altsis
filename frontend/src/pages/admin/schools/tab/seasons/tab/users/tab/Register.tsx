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

import React, { useState, useRef, useEffect } from "react";
import useDatabase from "hooks/useDatabase";
import * as xlsx from "xlsx";
import _ from "lodash";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";

import exampleData from "../../../../../exampleData/subjectExampleData";

type Props = {
  setPopupActive: any;
  seasonData: any;
  setIsLoading: any;
  registrationList: any[];
};

function Basic(props: Props) {
  const database = useDatabase();

  const [userList, setUserList] = useState<any>();
  const selectedSchoolUsers = useRef<any>(null);

  async function getUserList() {
    const { users: result } = await database.R({
      location: `users?schoolId=${props.seasonData.schoolId}`,
    });
    return result;
  }

  async function registerSelectedUsers() {
    const result = await database.C({
      location: `registrations/bulk`,
      data: {
        season: props.seasonData._id,
        users: selectedSchoolUsers.current,
      },
    });
    return result;
  }

  useEffect(() => {
    getUserList().then((res) => {
      setUserList(res);
    });
  }, []);

  return (
    <Popup
      title="사용자 등록"
      setState={props.setPopupActive}
      style={{ borderRadius: "4px", maxWidth: "800px", width: "100%" }}
      closeBtn
      contentScroll
      footer={
        <Button
          type={"ghost"}
          onClick={() => {
            registerSelectedUsers()
              .then(() => {
                props.setIsLoading(true);
                props.setPopupActive(false);
              })
              .catch(() => {
                // getRegistrations();
              });
          }}
        >
          + 학기에 유저 등록
        </Button>
      }
    >
      <div style={{ height: "calc(100vh - 300px)" }}>
        <Table
          type="object-array"
          defaultPageBy={50}
          // onSelectChange={(value) => {
          //   selectedSchoolUsers.current = value.map((val: any) => {
          //     return {
          //       userId: val.userId,
          //       userName: val.userName,
          //       role: "student",
          //     };
          //   });
          // }}
          control
          data={_.differenceBy(userList, props.registrationList, "userId")}
          header={[
            {
              text: "ID",
              key: "",
              type: "checkbox",
              width: "48px",
              textAlign: "center",
            },

            {
              text: "ID",
              key: "userId",
              type: "text",
              textAlign: "center",
            },
            {
              text: "이름",
              key: "userName",
              type: "text",
              textAlign: "center",
            },
          ]}
        />
      </div>
    </Popup>
  );
}

export default Basic;
