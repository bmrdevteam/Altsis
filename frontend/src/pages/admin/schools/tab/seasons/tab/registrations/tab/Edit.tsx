/**
 * @file Seasons Page Tab Item - Registration - Edit
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

// components
import Input from "components/input/Input";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import Select from "components/select/Select";

import _ from "lodash";
import Autofill from "components/input/Autofill";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  setPopupActive: any;
  registrationData: any;
  setIsLoading: any;
  registrationList: any[];
};

function Basic(props: Props) {
  const { RegistrationAPI } = useAPIv2();
  const [role, setRole] = useState<"student" | "teacher">(
    props.registrationData.role
  );
  const [grade, setGrade] = useState<string>(props.registrationData.grade);
  const [group, setGroup] = useState<string>(props.registrationData.group);
  const [teacher, setTeacher] = useState<string>(
    props.registrationData.teacher
  );
  const [teacherId, setTeacherId] = useState<string>(
    props.registrationData.teacherId
  );
  const [teacherName, setTeacherName] = useState<string>(
    props.registrationData.teacherName
  );
  const [subTeacher, setSubTeacher] = useState<string>(
    props.registrationData.subTeacher
  );
  const [subTeacherId, setSubTeacherId] = useState<string>(
    props.registrationData.subTeacherId
  );
  const [subTeacherName, setSubTeacherName] = useState<string>(
    props.registrationData.subTeacherName
  );

  const teachers = [
    {
      text: ``,
      value: JSON.stringify({
        teacher: undefined,
        teacherId: undefined,
        teacherName: undefined,
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
      title={`${props.registrationData.userName}(${props.registrationData.userId})`}
      setState={props.setPopupActive}
      style={{
        maxWidth: "300px",
        width: "100%",
      }}
      closeBtn
      contentScroll
      footer={
        <Button
          type={"ghost"}
          onClick={() => {
            RegistrationAPI.URegistration({
              params: { _id: props.registrationData._id },
              data: {
                role,
                grade,
                group,
                teacher,
                subTeacher,
              },
            })
              .then(() => {
                alert(SUCCESS_MESSAGE);
                props.setPopupActive(false);
              })
              .catch((err: any) => {
                ALERT_ERROR(err);
              })
              .finally(() => {
                props.setIsLoading(true);
              });
          }}
        >
          수정
        </Button>
      }
    >
      <div
        id="scrollDiv"
        style={{
          display: "flex",
          flexDirection: "column",
          overflowY: "scroll",
        }}
      >
        <div className={style.row}>
          <Select
            options={[
              { text: "학생", value: "student" },
              { text: "선생님", value: "teacher" },
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
            defaultValue={JSON.stringify({
              teacher,
              teacherId,
              teacherName,
            })}
            appearence="flat"
            label="담임 선생님"
            onChange={(e: any) => {
              const {
                teacher: _teacher,
                teacherId: _teacherId,
                teacherName: _teacherName,
              } = JSON.parse(e);
              setTeacher(_teacher);
              setTeacherId(_teacherId);
              setTeacherName(_teacherName);
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
            defaultValue={JSON.stringify({
              teacher: subTeacher,
              teacherId: subTeacherId,
              teacherName: subTeacherName,
            })}
            appearence="flat"
            label="부담임 선생님"
            onChange={(e: any) => {
              const {
                teacher: _teacher,
                teacherId: _teacherId,
                teacherName: _teacherName,
              } = JSON.parse(e);
              setSubTeacher(_teacher);
              setSubTeacherId(_teacherId);
              setSubTeacherName(_teacherName);
            }}
          />
        </div>
      </div>
    </Popup>
  );
}

export default Basic;
