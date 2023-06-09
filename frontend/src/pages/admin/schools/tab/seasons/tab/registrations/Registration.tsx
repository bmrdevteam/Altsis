/**
 * @file Seasons Page Tab Item - Registration
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
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
import Table from "components/tableV2/Table";
import { useEffect, useRef } from "react";
import { useState } from "react";

import _ from "lodash";

import Register2 from "./tab/Register2";
import Edit from "./tab/Edit";
import EditBulk from "./tab/EditBulk";
import SelectSeason from "./tab/RegisterCopy";
import Svg from "assets/svg/Svg";
import style from "style/pages/admin/schools.module.scss";
import { TSeasonRegistration, TSeasonWithRegistrations } from "types/seasons";
import { TRegistration } from "types/registrations";
import useAPIv2 from "hooks/useAPIv2";
import { MESSAGE } from "hooks/_message";
import Popup from "components/popup/Popup";
import Progress from "components/progress/Progress";
import Callout from "components/callout/Callout";
import Button from "components/button/Button";

type Props = {
  seasonData: TSeasonWithRegistrations;
  updateSeasonDataRegistrations: () => Promise<void>;
};

const Index = (props: Props) => {
  const { RegistrationAPI } = useAPIv2();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [registrationList, setRegistrationList] = useState<
    TSeasonRegistration[]
  >([]);
  const selectedRegistrations = useRef<
    (TRegistration & { tableRowSelect: boolean })[]
  >([]);

  const [registration, setRegistration] = useState<any>();

  const [registerUserPopupActive, setRegisterUserPopupActive] =
    useState<boolean>(false);
  const [registerCopyPopupActive, setRegisterCopyPopupActive] =
    useState<boolean>(false);
  const [editPopupActive, setEditPopupActive] = useState<boolean>(false);
  const [editBulkPopupActive, setEditBulkPopupActive] =
    useState<boolean>(false);

  const [statusPopupActive, setStatuePopupActive] = useState<boolean>(false);
  const [ratio, setRatio] = useState<number>(0);
  const [failedList, setFailedList] = useState<
    { userName: string; message: string }[]
  >([]);

  const onClickRemoveHandler = async () => {
    if (_.isEmpty(selectedRegistrations.current)) {
      alert("선택된 사용자가 없습니다.");
    } else {
      setStatuePopupActive(true);
      setRatio(0);
      const failedList = [];

      for (let i = 0; i < selectedRegistrations.current.length; i++) {
        try {
          await RegistrationAPI.DRegistration({
            params: { _id: selectedRegistrations.current[i]._id },
          });
        } catch (err: any) {
          failedList.push({
            userName: selectedRegistrations.current[i].userName,
            message: MESSAGE.get(err) ?? "알 수 없는 에러가 발생했습니다.",
          });
        } finally {
          setRatio((i + 1) / selectedRegistrations.current.length);
        }
        setIsLoading(true);
        setFailedList(failedList);
      }
    }
  };

  useEffect(() => {
    if (isLoading) {
      props.updateSeasonDataRegistrations().then(() => {
        setIsLoading(false);
      });
    }
    return () => {};
  }, [isLoading]);

  useEffect(() => {
    setRegistrationList(props.seasonData.registrations);
    selectedRegistrations.current = [];
    return () => {};
  }, [props.seasonData.registrations]);

  return (
    <div>
      <div
        className={style.table_header}
        style={{
          display: "flex",
          marginTop: "24px",
          marginLeft: "12px",
          marginRight: "12px",
        }}
      >
        <div
          style={{
            flex: "auto",
            display: "flex",
            gap: "12px",
          }}
        >
          <div
            className={style.icon}
            onClick={() => {
              setRegisterUserPopupActive(true);
            }}
            style={{ display: "flex", gap: "4px" }}
          >
            <Svg type="userPlus" width="20px" height="20px" />
            사용자 등록
          </div>
          {registrationList?.length === 0 && (
            <div
              className={style.icon}
              onClick={() => {
                setRegisterCopyPopupActive(true);
              }}
              style={{ display: "flex", gap: "4px" }}
            >
              <Svg type="arrowToBottom" width="20px" height="20px" />
              이전 학기 등록 정보 불러오기
            </div>
          )}
        </div>
        <div
          style={{
            flex: "auto",
            marginRight: "12px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <div
            className={style.icon}
            onClick={() => {
              if (_.isEmpty(selectedRegistrations?.current)) {
                alert("선택된 사용자가 없습니다.");
              } else {
                setEditBulkPopupActive(true);
              }
            }}
            style={{ display: "flex", gap: "4px" }}
          >
            <Svg type="edit" width="20px" height="20px" />
            수정
          </div>
        </div>

        <div
          className={style.icon}
          onClick={onClickRemoveHandler}
          style={{ display: "flex", gap: "4px" }}
        >
          <Svg type="trash" width="20px" height="20px" />
          삭제
        </div>
      </div>

      <div style={{ marginTop: "24px" }}>
        <Table
          data={
            !isLoading
              ? registrationList.map((registration: any) => {
                  return {
                    ...registration,
                    teacherTxt: registration.teacherId
                      ? `${registration.teacherName}\n(${registration.teacherId})`
                      : "",
                    subTeacherTxt: registration.subTeacherId
                      ? `${registration.subTeacherName}\n(${registration.subTeacherId})`
                      : "",
                  };
                })
              : []
          }
          type="object-array"
          control
          onChange={(value: any[]) => {
            selectedRegistrations.current = _.filter(value, {
              tableRowChecked: true,
            });
          }}
          header={[
            {
              text: "checkbox",
              key: "",
              type: "checkbox",
              width: "48px",
            },
            {
              text: "역할",
              key: "role",
              textAlign: "center",
              type: "status",
              status: {
                teacher: { text: "선생님", color: "blue" },
                student: { text: "학생", color: "orange" },
              },
              width: "84px",
            },
            {
              text: "학년",
              key: "grade",
              type: "text",
              textAlign: "center",
              whiteSpace: "pre",
            },
            {
              text: "이름",
              key: "userName",
              type: "text",
              textAlign: "center",
              whiteSpace: "pre",
            },
            {
              text: "ID",
              key: "userId",
              type: "text",
              textAlign: "center",
              whiteSpace: "pre",
            },

            {
              text: "그룹",
              key: "group",
              type: "text",
              textAlign: "center",
            },
            {
              text: "담임 선생님",
              key: "teacherTxt",
              type: "text",
              textAlign: "center",
              whiteSpace: "pre-wrap",
            },
            {
              text: "부담임 선생님",
              key: "subTeacherTxt",
              type: "text",
              textAlign: "center",
              whiteSpace: "pre-wrap",
            },
            {
              text: "수정",
              key: "edit",
              type: "button",
              onClick: (e: any) => {
                setRegistration(e);
                setEditPopupActive(true);
              },
              width: "72px",
              textAlign: "center",
              btnStyle: {
                border: true,
                color: "black",
                padding: "4px",
                round: true,
              },
            },
          ]}
        />
      </div>

      {registerUserPopupActive && (
        <Register2
          setPopupActive={setRegisterUserPopupActive}
          seasonData={props.seasonData}
          setIsLoading={setIsLoading}
        />
      )}
      {editPopupActive && (
        <Edit
          setPopupActive={setEditPopupActive}
          registrationData={registration}
          setIsLoading={setIsLoading}
          registrationList={registrationList}
        />
      )}
      {editBulkPopupActive && (
        <EditBulk
          setPopupActive={setEditBulkPopupActive}
          setIsLoading={setIsLoading}
          registrationList={registrationList}
          selectedRegistrationList={selectedRegistrations.current}
        />
      )}
      {registerCopyPopupActive && (
        <SelectSeason
          setPopupActive={setRegisterCopyPopupActive}
          seasonData={props.seasonData}
          setIsLoading={setIsLoading}
        />
      )}
      {statusPopupActive && (
        <Popup
          setState={() => {}}
          style={{ maxWidth: "640px", width: "100%" }}
          title="사용자 일괄 삭제"
          contentScroll
        >
          <div className={style.popup}>
            <Progress value={ratio} style={{ margin: "12px 0px" }} />
            {failedList.length > 0 && (
              <Callout
                type="error"
                style={{ whiteSpace: "pre" }}
                title={"삭제되지 않은 항목이 있습니다."}
                description={failedList
                  .map(({ userName, message }) => `${userName}: ${message}`)
                  .join("\n")}
              />
            )}
            {ratio === 1 && (
              <div>
                <Button
                  type={"ghost"}
                  onClick={() => setStatuePopupActive(false)}
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
    </div>
  );
};

export default Index;
