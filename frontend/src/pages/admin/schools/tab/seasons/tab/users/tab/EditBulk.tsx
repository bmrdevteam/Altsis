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
import { useState } from "react";
import style from "style/pages/admin/schools.module.scss";
import useApi from "hooks/useApi";

// components
import Input from "components/input/Input";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import Select from "components/select/Select";

import _ from "lodash";
import Autofill from "components/input/Autofill";

type Props = {
  setPopupActive: any;
  setIsLoading: any;
  registrationList: any[];
  selectedRegistrationList: any[];
};

function Basic(props: Props) {
  const { RegistrationApi } = useApi();
  const [role, setRole] = useState<string>("student");
  const [grade, setGrade] = useState<string>("");
  const [group, setGroup] = useState<string>("");
  const [teacher, setTeacher] = useState<string>();
  const [teacherId, setTeacherId] = useState<string>();
  const [teacherName, setTeacherName] = useState<string>();
  const [subTeacher, setSubTeacher] = useState<string>();
  const [subTeacherId, setSubTeacherId] = useState<string>();
  const [subTeacherName, setSubTeacherName] = useState<string>();

  const teachers = [
    {
      text: ``,
      value: JSON.stringify({
        teacher: "",
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
          teacher: registration.user,
          teacherId: registration.userId,
          teacherName: registration.userName,
        }),
      };
    }),
  ];

  return (
    <Popup
      title={`일괄 수정`}
      setState={props.setPopupActive}
      style={{
        maxWidth: "300px",
        width: "100%",
      }}
      closeBtn
      contentScroll
    >
      <div
        className={style.popup}
        id="scrollDiv"
        style={{ overflowY: "scroll" }}
      >
        <div className={style.row}>
          <Select
            options={[
              { text: "student", value: "student" },
              { text: "teacher", value: "teacher" },
            ]}
            defaultSelectedValue={role}
            appearence="flat"
            label="역할"
            required
            onChange={(e: any) => {
              setRole(e);
            }}
          />
        </div>

        <div className={style.row} style={{ marginTop: "24px" }}>
          <Input
            defaultValue={grade}
            appearence="flat"
            label="학년"
            onChange={(e: any) => {
              setGrade(e.target.value);
            }}
          />
        </div>

        <div className={style.row} style={{ marginTop: "24px" }}>
          <Input
            defaultValue={group}
            appearence="flat"
            label="그룹"
            onChange={(e: any) => {
              setGroup(e.target.value);
            }}
          />
        </div>

        <div className={style.row} style={{ marginTop: "24px" }}>
          <Autofill
            onEdit={(edit: boolean) => {
              const scrollDiv = document.getElementById("scrollDiv");
              scrollDiv?.scrollTo(0, scrollDiv.scrollHeight);
            }}
            options={teachers}
            appearence="flat"
            label="담임 선생님"
            onChange={(e: any) => {
              const {
                teacher: _teacher,
                teacherId: _teacherId,
                teacherName: _teacherName,
              } = JSON.parse(e);
              if (_teacher) {
                setTeacher(_teacher);
                setTeacherId(_teacherId);
                setTeacherName(_teacherName);
              } else {
                setTeacher(undefined);
                setTeacherId(undefined);
                setTeacherName(undefined);
              }
            }}
          />
        </div>

        <div className={style.row} style={{ marginTop: "24px" }}>
          <Autofill
            onEdit={(edit: boolean) => {
              const scrollDiv = document.getElementById("scrollDiv");
              scrollDiv?.scrollTo(0, scrollDiv.scrollHeight);
            }}
            options={teachers}
            appearence="flat"
            label="부담임 선생님"
            onChange={(e: any) => {
              const {
                teacher: _teacher,
                teacherId: _teacherId,
                teacherName: _teacherName,
              } = JSON.parse(e);
              if (_teacher) {
                setSubTeacher(_teacher);
                setSubTeacherId(_teacherId);
                setSubTeacherName(_teacherName);
              } else {
                setTeacher(undefined);
                setTeacherId(undefined);
                setTeacherName(undefined);
              }
            }}
          />
        </div>

        <Button
          type={"ghost"}
          style={{ marginTop: "24px" }}
          onClick={() => {
            RegistrationApi.URegistrations({
              _ids: props.selectedRegistrationList,
              data: {
                role,
                grade,
                group,
                teacher,
                teacherId,
                teacherName,
                subTeacher,
                subTeacherId,
                subTeacherName,
              },
            })
              .then(() => {
                alert(SUCCESS_MESSAGE);
                props.setIsLoading(true);
                props.setPopupActive(false);
              })
              .catch((err: any) => alert(err.response.data.message));
          }}
        >
          수정
        </Button>
      </div>
    </Popup>
  );
}

export default Basic;
