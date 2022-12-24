/**
 * @file Notifications Sent Page
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
import { useEffect, useState, useRef } from "react";
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";

import style from "./mailbox.module.scss";

// components
import Table from "components/tableV2/Table";
import Svg from "assets/svg/Svg";

import _ from "lodash";

// import Mailbox from "../components/mailbox";
import Send from "../popup/Send";
import View from "../popup/View";

type Props = {};

const Sent = (props: Props) => {
  const database = useDatabase();
  const { currentUser, currentRegistration, currentSchool } = useAuth();

  const [notificationList, setNotificationList] = useState<any[]>([]);
  const [notification, setNotification] = useState<any>();
  const selectRef = useRef<string[]>();

  const [notificatnionPopupActive, setNotificatnionPopupActive] =
    useState<boolean>(false);

  const [isReceiverOptionListLoaded, setIsReceiverOptionListLoaded] =
    useState<boolean>(false);
  const [receiverType, setReceiverType] = useState<string>("");
  const [receiverList, setReceiverList] = useState<any[]>([]);
  const [receiverOptionList, setReceiverOptionList] = useState<any[]>([]);

  const [sendPopupActive, setSendPopupActive] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function getNotificationList() {
    const { notifications } = await database.R({
      location: `notifications?type=sent&userId=${currentUser?.userId}`,
    });
    return notifications;
  }

  async function getNotification(_id: string) {
    const res = await database.R({
      location: `notifications/${_id}`,
    });

    return res;
  }

  async function getRegistrationList() {
    const { registrations } = await database.R({
      location: `registrations?season=${currentRegistration?.season}`,
    });

    return registrations;
  }

  async function getSchoolUserList() {
    const { users } = await database.R({
      location: `users?schools.school=${currentSchool._id}`,
    });

    return users;
  }

  async function getUserList() {
    const { users } = await database.R({
      location: `users`,
    });

    return users;
  }

  useEffect(() => {
    if (isLoading) {
      getNotificationList().then((res: any) => {
        setNotificationList(
          res.map((val: any) => {
            return {
              ...val,
              toUser: `${val.toUserList[0].userName}(${
                val.toUserList[0].userId
              })${
                val.toUserList.length > 1
                  ? ` 외 ${val.toUserList.length - 1}명`
                  : ``
              }`,
            };
          })
        );
        selectRef.current = [];
        setIsLoading(false);
      });
    }
  }, [isLoading]);

  async function deleteNotifications(ids: string[]) {
    const res = await database.D({
      location: `notifications/${_.join(ids, "&")}`,
    });
    return res;
  }

  useEffect(() => {
    setIsReceiverOptionListLoaded(false);
  }, [currentRegistration]);

  async function updateReceiverOptionList() {
    if (currentRegistration) {
      setReceiverType("season");
      getRegistrationList().then((res: any) => {
        setReceiverList(res);
      });
    } else if (currentSchool) {
      setReceiverType("school");
      getSchoolUserList().then((res: any) => {
        setReceiverList(res);
      });
    } else {
      setReceiverType("academy");
      getUserList().then((res: any) => {
        setReceiverList(res);
      });
    }
  }

  useEffect(() => {
    if (receiverList) {
      setReceiverOptionList(
        receiverList.map((receiver: any) => {
          return {
            value: JSON.stringify({
              userId: receiver.userId,
              userName: receiver.userName,
            }),
            text: `${receiver.userName}(${receiver.userId})`,
          };
        })
      );
    }

    return () => {};
  }, [receiverList]);

  return !isLoading ? (
    <>
      <div className={style.section}>
        <div className={style.mailbox}>
          <div className={style.table_header} style={{ display: "flex" }}>
            <div
              style={{
                flex: "auto",
                marginLeft: "12px",
                display: "flex",
                gap: "12px",
              }}
            >
              <div
                className={style.icon}
                onClick={() => {
                  if (_.isEmpty(selectRef.current)) {
                    alert("select notifications to delete");
                  } else {
                    deleteNotifications(selectRef.current || [])
                      .then((res: any) => {
                        setIsLoading(true);
                        alert("success");
                      })
                      .catch((err: any) => alert(err.response.data.message));
                  }
                }}
              >
                <Svg type="trash" width="20px" height="20px" />
              </div>
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
                  if (!isReceiverOptionListLoaded) {
                    updateReceiverOptionList().then(() => {
                      setIsReceiverOptionListLoaded(true);
                    });
                  }
                  setSendPopupActive(true);
                }}
                style={{ display: "flex", gap: "4px" }}
              >
                <Svg type="send" width="20px" height="20px" />
                알림 보내기
              </div>
            </div>
          </div>

          <div style={{ marginTop: "12px" }}></div>
          <Table
            type="object-array"
            data={notificationList}
            control
            defaultPageBy={10}
            onChange={(value: any[]) => {
              selectRef.current = _.filter(value, {
                tableRowChecked: true,
              }).map((val: any) => val._id);
            }}
            header={[
              {
                text: "선택",
                key: "select",
                type: "checkbox",
                width: "48px",
              },
              {
                text: "받은사람",
                key: "toUser",
                type: "text",
                width: "180px",
              },
              {
                text: "구분",
                key: "category",
                type: "text",
                width: "120px",
              },
              {
                text: "제목",
                key: "title",
                type: "text",
              },

              {
                text: "날짜",
                key: "createdAt",
                type: "text",
                textAlign: "right",
                width: "240px",
              },

              {
                text: "자세히",
                key: "_id",
                type: "button",
                onClick: (e: any) => {
                  getNotification(e._id)
                    .then((res) => {
                      setNotification(res);
                      setNotificatnionPopupActive(true);
                    })
                    .catch((err) => alert(err.response.data.message));
                },
                width: "80px",
                textAlign: "center",
              },
            ]}
          />
        </div>
        {notificatnionPopupActive && (
          <View
            setState={setNotificatnionPopupActive}
            data={notification}
            type={"sent"}
          />
        )}
      </div>
      {sendPopupActive && isReceiverOptionListLoaded && (
        <Send
          setState={setSendPopupActive}
          receiverOptionList={receiverOptionList}
          receiverList={receiverList}
          receiverType={receiverType}
        />
      )}
    </>
  ) : (
    <></>
  );
};

export default Sent;
