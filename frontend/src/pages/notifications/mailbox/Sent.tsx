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
import style from "./mailbox.module.scss";

// components
import Table from "components/tableV2/Table";
import Svg from "assets/svg/Svg";

import _ from "lodash";

// import Mailbox from "../components/mailbox";
import Send from "../popup/Send";
import View from "../popup/View";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {};

const Sent = (props: Props) => {
  const { currentSeason, currentRegistration, currentSchool } = useAuth();
  const { UserAPI, NotificationAPI } = useAPIv2();

  const [notificationList, setNotificationList] = useState<any[]>([]);
  const [notification, setNotification] = useState<any>();
  const selectRef = useRef<string[]>([]);

  const [notificatnionPopupActive, setNotificatnionPopupActive] =
    useState<boolean>(false);

  const [receiverType, setReceiverType] = useState<string>("");
  const [receiverList, setReceiverList] = useState<any[]>([]);

  const [sendPopupActive, setSendPopupActive] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function getSchoolUserList() {
    const { users } = await UserAPI.RUsers({
      query: { sid: currentSchool.school },
    });

    return users;
  }

  async function getUserList() {
    const { users } = await UserAPI.RUsers({});

    return users;
  }

  useEffect(() => {
    if (isLoading) {
      NotificationAPI.RNotifications({ query: { type: "sent" } })
        .then(({ notifications }) => {
          setNotificationList(
            notifications.map((val: any) => {
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
        })
        .then(() => {
          selectRef.current = [];
          setIsLoading(false);
        });

      updateReceiverList();
    }
  }, [isLoading]);

  async function updateReceiverList() {
    if (currentRegistration && currentSeason) {
      setReceiverType("season");
      setReceiverList(currentSeason.registrations);
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
                onClick={async () => {
                  if (_.isEmpty(selectRef.current)) {
                    alert("선택된 알림이 없습니다.");
                  } else {
                    await Promise.all(
                      selectRef.current?.map((_id) =>
                        NotificationAPI.DNotification({ params: { _id } })
                      )
                    );
                    setIsLoading(true);
                    alert(SUCCESS_MESSAGE);
                  }
                }}
              >
                <Svg type="trash" width="20px" height="20px" />
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
                key: "date",
                type: "date",
                textAlign: "right",
                width: "180px",
              },

              {
                text: "자세히",
                key: "_id",
                type: "button",
                onClick: (e: any) => {
                  NotificationAPI.RNotification({ params: { _id: e._id } })
                    .then(({ notification }) => {
                      setNotification(notification);
                    })
                    .then(() => setNotificatnionPopupActive(true))
                    .catch((err) => ALERT_ERROR(err));
                },
                width: "80px",
                textAlign: "center",
                btnStyle: {
                  border: true,
                  color: "var(--accent-1)",
                  padding: "4px",
                  round: true,
                },
              },
            ]}
          />
        </div>
        {notificatnionPopupActive && notification && (
          <View
            setState={setNotificatnionPopupActive}
            nid={notification._id}
            type={"sent"}
          />
        )}
      </div>
      {sendPopupActive && (
        <Send
          setState={setSendPopupActive}
          receiverList={receiverList}
          receiverType={receiverType}
          setIsLoading={setIsLoading}
        />
      )}
    </>
  ) : (
    <></>
  );
};

export default Sent;