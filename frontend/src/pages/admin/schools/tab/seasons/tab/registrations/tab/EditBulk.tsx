/**
 * @file Seasons Page Tab Item - Registration - EditBulk
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
import useAPIv2 from "hooks/useAPIv2";
import { MESSAGE } from "hooks/_message";
import Progress from "components/progress/Progress";
import Callout from "components/callout/Callout";
import { TSeasonRegistration } from "types/seasons";
import { TRegistration } from "types/registrations";

type Props = {
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  registrationList: TSeasonRegistration[];
  selectedRegistrationList: TRegistration[];
};

function Basic(props: Props) {
  const { RegistrationAPI } = useAPIv2();
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [grade, setGrade] = useState<string>("");
  const [group, setGroup] = useState<string>("");
  const [teacher, setTeacher] = useState<string>();
  const [subTeacher, setSubTeacher] = useState<string>();

  const [ratio, setRatio] = useState<number>(0);
  const [statusPopupActive, setStatusPopupActive] = useState<boolean>(false);
  const [failedList, setFailedList] = useState<
    { userId: string; userName: string; message: string }[]
  >([]);

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

  const updateHandler = async () => {
    setStatusPopupActive(true);
    const failedList: { userId: string; userName: string; message: string }[] =
      [];

    for (let i = 0; i < props.selectedRegistrationList.length; i++) {
      try {
        await RegistrationAPI.URegistration({
          params: { _id: props.selectedRegistrationList[i]._id },
          data: {
            role,
            grade,
            group,
            teacher,
            subTeacher,
          },
        });
      } catch (err: any) {
        failedList.push({
          userId: props.selectedRegistrationList[i].userId,
          userName: props.selectedRegistrationList[i].userName,
          message:
            MESSAGE.get(err ?? "UNKOWN") ?? "알 수 없는 에러가 발생했습니다.",
        });
      } finally {
        setRatio((i + 1) / props.selectedRegistrationList.length);
      }
    }
    props.setIsLoading(true);
    setFailedList(failedList);
  };

  return (
    <>
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
              appearence="flat"
              label="담임 선생님"
              onChange={(e: any) => {
                const { teacher: _teacher } = JSON.parse(e);
                setTeacher(_teacher);
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
                const { teacher: _teacher } = JSON.parse(e);
                setSubTeacher(_teacher);
              }}
            />
          </div>

          <Button
            type={"ghost"}
            style={{ marginTop: "24px" }}
            onClick={updateHandler}
          >
            수정
          </Button>
        </div>
      </Popup>
      {statusPopupActive && (
        <Popup
          setState={() => {}}
          style={{ maxWidth: "640px", width: "100%" }}
          title="사용자 일괄 수정"
          contentScroll
        >
          <div className={style.popup}>
            <Progress value={ratio} style={{ margin: "12px 0px" }} />
            {failedList.length > 0 && (
              <Callout
                type="error"
                style={{ whiteSpace: "pre" }}
                title={"저장되지 않은 항목이 있습니다."}
                description={failedList
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
