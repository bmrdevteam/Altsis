/**
 * @file User School Bulk Page Tab Item - Basic
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

import React, { useRef } from "react";
import useDatabase from "hooks/useDatabase";
import _ from "lodash";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";

// functions

type Props = {
  schoolList: any;
  setPopupActive: any;
  updateUserList: any;
  selectedUserList: any[];
};

function Basic(props: Props) {
  const database = useDatabase();

  const schoolSelectRef = useRef<any[]>([]);

  async function addSchoolBulk() {
    // console.log(" props.selectedUserList is ", props.selectedUserList);
    const schools = schoolSelectRef.current.map((school) => {
      return {
        school: school._id,
        schoolId: school.schoolId,
        schoolName: school.schoolName,
      };
    });

    const { users: result } = await database.U({
      location: `users/schools/bulk`,
      data: {
        type: "add",
        schools: schools,
        userIds: props.selectedUserList.map((user: any) => user._id),
      },
    });
    return result;
  }

  async function deleteSchoolBulk() {
    const schools = schoolSelectRef.current.map((school) => {
      return {
        school: school._id,
        schoolId: school.schoolId,
        schoolName: school.schoolName,
      };
    });

    const { users: result } = await database.U({
      location: `users/schools/bulk`,
      data: {
        type: "remove",
        schools: schools,
        userIds: props.selectedUserList.map((user: any) => user._id),
      },
    });
    return result;
  }

  return (
    <>
      <Popup
        title="학교 일괄 설정"
        closeBtn
        setState={props.setPopupActive}
        style={{ maxWidth: "1000px", width: "100%" }}
        contentScroll
      >
        <div className={style.popup}>
          <div>
            선택된 아카데미 사용자를 학교에 등록하거나 취소할 수 있습니다.
          </div>
          <div style={{ marginTop: "24px" }}>
            <Table
              type="object-array"
              data={props.schoolList}
              onChange={(value: any[]) => {
                schoolSelectRef.current = _.filter(value, {
                  tableRowChecked: true,
                });
              }}
              header={[
                {
                  text: "선택",
                  key: "",
                  type: "checkbox",
                  width: "48px",
                },

                {
                  text: "학교 ID",
                  key: "schoolId",
                  type: "text",
                  textAlign: "center",
                },
                {
                  text: "학교 이름",
                  key: "schoolName",
                  type: "text",
                  textAlign: "center",
                },
              ]}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              marginTop: "24px",
            }}
          >
            <Button
              type={"ghost"}
              onClick={() => {
                if (schoolSelectRef.current.length === 0) {
                  alert("선택된 학교가 없습니다.");
                } else {
                  addSchoolBulk()
                    .then((res) => {
                      alert(SUCCESS_MESSAGE);
                      res.forEach((user: any) => {
                        props.updateUserList(user.userId, user);
                      });
                      props.setPopupActive(false);
                    })
                    .catch((err) => alert(err.response.data.message));
                }
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",

                flex: "auto",
              }}
            >
              선택된 학교에 등록
            </Button>
            <Button
              type={"ghost"}
              onClick={() => {
                if (schoolSelectRef.current.length === 0) {
                  alert("선택된 학교가 없습니다.");
                } else {
                  deleteSchoolBulk()
                    .then((res) => {
                      res.forEach((user: any) => {
                        props.updateUserList(user.userId, user);
                      });
                      props.setPopupActive(false);
                    })
                    .catch((err) => alert(err.response.data.message));
                }
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                flex: "auto",
              }}
            >
              선택된 학교에 등록 취소
            </Button>
          </div>
        </div>
      </Popup>
    </>
  );
}

export default Basic;
