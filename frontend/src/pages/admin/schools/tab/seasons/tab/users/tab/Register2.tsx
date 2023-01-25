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

import { useState, useRef, useEffect } from "react";
import useApi from "hooks/useApi";
import _ from "lodash";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import Select from "components/select/Select";
import Input from "components/input/Input";
import Autofill from "components/input/Autofill";

type Props = {
  setPopupActive: any;
  seasonData: any;
  setIsLoading: any;
  registrationList: any[];
};

function Basic(props: Props) {
  const { UserApi, RegistrationApi } = useApi();

  const [userList, setUserList] = useState<any>();
  const selectedUsers = useRef<any>(null);

  const registrationInfo = useRef<any>({
    role: "student",
    group: "",
    teacherId: undefined,
    teacherName: undefined,
    subTeacherId: undefined,
    subTeacherName: undefined,
  }); //role, grade, group, teacher, subTeacher

  useEffect(() => {
    UserApi.RUsers({ school: props.seasonData.school }).then((res) => {
      setUserList(res);
    });
  }, []);

  return (
    <Popup
      title="사용자 등록"
      setState={props.setPopupActive}
      style={{ borderRadius: "4px", maxWidth: "800px" }}
      closeBtn
      contentScroll
      footer={
        <Button
          type={"ghost"}
          onClick={() => {
            console.log(registrationInfo.current);
            RegistrationApi.CRegistrations({
              data: {
                season: props.seasonData._id,
                users: selectedUsers.current,
                info: registrationInfo.current,
              },
            })
              .then((res) => {
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
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "24px",
          alignItems: "flex-start",
          height: "480px",
        }}
      >
        <div className={style.popup}>
          <div className={style.row}>
            <Table
              type="object-array"
              defaultPageBy={50}
              onChange={(value: any[]) => {
                selectedUsers.current = _.filter(value, {
                  tableRowChecked: true,
                }).map((val: any) => {
                  return {
                    userId: val.userId,
                    userName: val.userName,
                    role: "student",
                  };
                });
              }}
              control
              data={_.differenceBy(userList, props.registrationList, "userId")}
              header={[
                {
                  text: "",
                  key: "checkbox",
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
        </div>
        <div className={style.popup} style={{ position: "sticky", top: "0px" }}>
          <div className={style.row}>
            <Select
              options={[
                { text: "student", value: "student" },
                { text: "teacher", value: "teacher" },
              ]}
              appearence="flat"
              label="역할"
              required
              onChange={(e: any) => {
                registrationInfo.current.role = e;
              }}
            />
          </div>

          <div className={style.row} style={{ marginTop: "24px" }}>
            <Input
              appearence="flat"
              label="학년"
              onChange={(e: any) => {
                registrationInfo.current.grade = e.target.value;
              }}
            />
          </div>

          <div className={style.row} style={{ marginTop: "24px" }}>
            <Input
              appearence="flat"
              label="그룹"
              onChange={(e: any) => {
                registrationInfo.current.group = e.target.value;
              }}
            />
          </div>

          <div className={style.row} style={{ marginTop: "24px" }}>
            <Select
              options={[
                {
                  text: ``,
                  value: JSON.stringify({
                    teacherId: "",
                    teacherName: "",
                  }),
                },
                ..._.filter(props.registrationList, {
                  role: "teacher",
                }).map((registration: any) => {
                  return {
                    text: `${registration.userName}(${registration.userId})`,
                    value: JSON.stringify({
                      teacherId: registration.userId,
                      teacherName: registration.userName,
                    }),
                  };
                }),
              ]}
              appearence="flat"
              label="담임 선생님"
              onChange={(e: any) => {
                const { teacherId: _teacherId, teacherName: _teacherName } =
                  JSON.parse(e);
                registrationInfo.current.teacherId = _teacherId;
                registrationInfo.current.teacherName = _teacherName;
              }}
            />
          </div>
          <div className={style.row} style={{ marginTop: "24px" }}>
            <Select
              options={[
                {
                  text: ``,
                  value: JSON.stringify({
                    teacherId: "",
                    teacherName: "",
                  }),
                },
                ..._.filter(props.registrationList, {
                  role: "teacher",
                }).map((registration: any) => {
                  return {
                    text: `${registration.userName}(${registration.userId})`,
                    value: JSON.stringify({
                      teacherId: registration.userId,
                      teacherName: registration.userName,
                    }),
                  };
                }),
              ]}
              appearence="flat"
              label="부담임 선생님"
              onChange={(e: any) => {
                console.log(e);
                const { teacherId: _teacherId, teacherName: _teacherName } =
                  JSON.parse(e);
                registrationInfo.current.subTeacherId = _teacherId;
                registrationInfo.current.subTeacherName = _teacherName;
              }}
            />
          </div>
        </div>
      </div>
    </Popup>
  );
}

export default Basic;
