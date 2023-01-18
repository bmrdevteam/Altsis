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
import { useState, useEffect } from "react";
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
  registrationData: any;
  setIsLoading: any;
  registrationList: any[];
};

function Basic(props: Props) {
  const { RegistrationApi } = useApi();
  const [role, setRole] = useState<string>(props.registrationData.role);
  const [grade, setGrade] = useState<string>(props.registrationData.grade);
  const [group, setGroup] = useState<string>(props.registrationData.group);
  const [teacherId, setTeacherId] = useState<string>(
    props.registrationData.teacherId
  );
  const [teacherName, setTeacherName] = useState<string>(
    props.registrationData.teacherName
  );
  const [subTeacherId, setSubTeacherId] = useState<string>(
    props.registrationData.subTeacherId
  );
  const [subTeacherName, setSubTeacherName] = useState<string>(
    props.registrationData.subTeacherName
  );

  return (
    <Popup
      title={`${props.registrationData.userName}(${props.registrationData.userId})`}
      setState={props.setPopupActive}
      style={{
        borderRadius: "4px",
        maxWidth: "300px",
        width: "100%",
      }}
      closeBtn
      contentScroll
    >
      <div className={style.popup}>
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
            defaultSelectedValue={JSON.stringify({
              teacherId,
              teacherName,
            })}
            appearence="flat"
            label="담임 선생님"
            onChange={(e: any) => {
              const { teacherId: _teacherId, teacherName: _teacherName } =
                JSON.parse(e);
              setTeacherId(_teacherId);
              setTeacherName(_teacherName);
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
            defaultSelectedValue={JSON.stringify({
              teacherId: subTeacherId,
              teacherName: subTeacherName,
            })}
            appearence="flat"
            label="부담임 선생님"
            onChange={(e: any) => {
              const { teacherId: _teacherId, teacherName: _teacherName } =
                JSON.parse(e);
              setSubTeacherId(_teacherId);
              setSubTeacherName(_teacherName);
            }}
          />
        </div>

        <Button
          type={"ghost"}
          style={{ marginTop: "24px" }}
          onClick={() => {
            RegistrationApi.URegistrations({
              _id: props.registrationData._id,
              data: {
                role,
                grade,
                group,
                teacherId,
                teacherName,
                subTeacherId,
                subTeacherName,
              },
            })
              .then(() => {
                alert("success");
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
