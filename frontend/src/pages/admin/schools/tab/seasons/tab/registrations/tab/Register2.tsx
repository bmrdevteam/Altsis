/**
 * @file Seasons Page Tab Item - Registration - Register
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
import _ from "lodash";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import Select from "components/select/Select";
import Input from "components/input/Input";
import Autofill from "components/input/Autofill";

import useAPIv2 from "hooks/useAPIv2";
import { TSeasonWithRegistrations } from "types/seasons";
import Progress from "components/progress/Progress";
import Callout from "components/callout/Callout";
import { MESSAGE } from "hooks/_message";

type Props = {
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  seasonData: TSeasonWithRegistrations;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

type TRegistrationInfo = {
  role: "student" | "teacher";
  grade?: string;
  group?: string;
  teacher?: string;
  teacherId?: string;
  teacherName?: string;
  subTeacher?: string;
  subTeacherId?: string;
  subTeacherName?: string;
};

type TUser = {
  _id: string;
  userId: string;
  userName: string;
};

function Basic(props: Props) {
  const { UserAPI, RegistrationAPI } = useAPIv2();

  const [userList, setUserList] = useState<TUser[]>([]);
  const selectedUsers = useRef<TUser[]>([]);

  const [resultPopupActive, setResultPopupActive] = useState<boolean>(false);
  const [ratio, setRatio] = useState<number>(0);
  const [failedUserList, setFailedUserList] = useState<
    (TUser & { message: string })[]
  >([]);

  //role, grade, group, teacher, subTeacher
  const infoRef = useRef<TRegistrationInfo>({
    role: "student",
    grade: "",
    group: "",
  });

  const teachers = [
    {
      text: ``,
      value: JSON.stringify({
        teacher: "",
        teacherId: "",
        teacherName: "",
      }),
    },
    ..._.filter(props.seasonData.registrations, {
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

  const registerHandler = async () => {
    setResultPopupActive(true);

    const failedUserList: (TUser & { message: string })[] = [];

    for (let i = 0; i < selectedUsers.current.length; i++) {
      try {
        await RegistrationAPI.CRegistration({
          data: {
            season: props.seasonData._id,
            user: selectedUsers.current[i]._id,
            role: infoRef.current.role,
            grade: infoRef.current.grade,
            group: infoRef.current.group,
            teacher: infoRef.current.teacher,
            subTeacher: infoRef.current.subTeacher,
          },
        });
      } catch (err: any) {
        failedUserList.push({
          ...selectedUsers.current[i],
          message: MESSAGE.get(err) ?? "알 수 없는 에러가 발생했습니다.",
        });
      } finally {
        setRatio((i + 1) / selectedUsers.current.length);
      }
    }
    alert(SUCCESS_MESSAGE);
    setFailedUserList(failedUserList);

    props.setIsLoading(true);
  };

  useEffect(() => {
    UserAPI.RUsers({ query: { sid: props.seasonData.school } }).then(
      ({ users }) => {
        setUserList(
          _.differenceBy(users, props.seasonData.registrations, "userId")
        );
      }
    );
  }, []);

  return (
    <>
      <Popup
        title="사용자 등록"
        setState={props.setPopupActive}
        style={{ maxWidth: "800px" }}
        closeBtn
        contentScroll
        footer={
          <Button type={"ghost"} onClick={registerHandler}>
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
          <div
            className={style.popup}
            style={{ overflowY: "scroll", height: "100%" }}
          >
            <div className={style.row}>
              <Table
                type="object-array"
                defaultPageBy={50}
                onChange={(value: any[]) => {
                  selectedUsers.current = _.filter(value, {
                    tableRowChecked: true,
                  }).map((val: any) => {
                    return {
                      _id: val._id,
                      userId: val.userId,
                      userName: val.userName,
                    };
                  });
                }}
                control
                data={userList}
                header={[
                  {
                    text: "",
                    key: "checkbox",
                    type: "checkbox",
                    width: "48px",
                    textAlign: "center",
                  },
                  {
                    text: "이름",
                    key: "userName",
                    type: "text",
                    textAlign: "center",
                  },
                  {
                    text: "ID",
                    key: "userId",
                    type: "text",
                    textAlign: "center",
                  },
                ]}
              />
            </div>
          </div>
          <div
            id="scrollDiv"
            className={style.popup}
            style={{ overflowY: "scroll", height: "100%" }}
          >
            <div className={style.row}>
              <Select
                options={[
                  { text: "학생", value: "student" },
                  { text: "선생님", value: "teacher" },
                ]}
                appearence="flat"
                label="역할"
                required
                onChange={(e: any) => {
                  infoRef.current.role = e;
                }}
              />
            </div>

            <div className={style.row} style={{ marginTop: "24px" }}>
              <Input
                appearence="flat"
                label="학년"
                onChange={(e: any) => {
                  infoRef.current.grade = e.target.value;
                }}
              />
            </div>

            <div className={style.row} style={{ marginTop: "24px" }}>
              <Input
                appearence="flat"
                label="그룹"
                onChange={(e: any) => {
                  infoRef.current.group = e.target.value;
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
                  infoRef.current.teacher = _teacher;
                  infoRef.current.teacherId = _teacherId;
                  infoRef.current.teacherName = _teacherName;
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
                  infoRef.current.subTeacher = _teacher;
                  infoRef.current.subTeacherId = _teacherId;
                  infoRef.current.subTeacherName = _teacherName;
                }}
              />
            </div>
          </div>
        </div>
      </Popup>
      {resultPopupActive && (
        <Popup
          setState={() => {}}
          style={{ maxWidth: "640px", width: "100%" }}
          title="사용자 일괄 등록"
          contentScroll
        >
          <div className={style.popup}>
            <Progress value={ratio} style={{ margin: "12px 0px" }} />
            {failedUserList.length > 0 && (
              <Callout
                type="error"
                style={{ whiteSpace: "pre" }}
                title={"저장되지 않은 항목이 있습니다."}
                description={failedUserList
                  .map(({ userId, message }) => `${userId}: ${message}`)
                  .join("\n")}
              />
            )}
            {ratio === 1 && (
              <div>
                <Button
                  type={"ghost"}
                  onClick={() => props.setPopupActive(false)}
                  style={{
                    borderRadius: "4px",
                    height: "32px",
                    boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                    marginTop: "24px",
                  }}
                >
                  확인
                </Button>
              </div>
            )}
          </div>
        </Popup>
      )}
    </>
  );
}

export default Basic;
