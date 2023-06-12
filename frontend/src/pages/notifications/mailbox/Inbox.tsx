/**
 * @file Notifications Inbox Page
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
import useApi from "hooks/useApi";

import style from "./mailbox.module.scss";

// components
import Table from "components/tableV2/Table";
import Svg from "assets/svg/Svg";

import _ from "lodash";

// import Mailbox from "../components/mailbox";
import View from "../popup/View";
import { TNotificationReceived } from "types/notification";
import useAPIv2 from "hooks/useAPIv2";

type Props = {};

const Received = (props: Props) => {
  const { currentUser } = useAuth();
  const { NotificationAPI } = useAPIv2();

  const [notificationList, setNotificationList] = useState<any[]>([]);
  const [notification, setNotification] = useState<TNotificationReceived>();
  const selectRef = useRef<string[]>([]);

  const [notificatnionPopupActive, setNotificatnionPopupActive] =
    useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isLoading) {
      NotificationAPI.RNotifications({
        query: { type: "received" },
      })
        .then(({ notifications }) => {
          setNotificationList(
            notifications.map((val: any) => {
              return {
                ...val,
                fromUser: `${val.fromUserName}(${val.fromUserId})`,
              };
            })
          );

          setIsLoading(false);
        })
        .then(() => {});
    }
  }, [isLoading]);

  return (
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
          <div
            style={{
              flex: "auto",
              marginRight: "12px",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            <></>
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
              text: "보낸사람",
              key: "fromUser",
              type: "text",
              width: "160px",
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
                setNotification(e);
                setNotificatnionPopupActive(true);
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
          type={"received"}
        />
      )}
    </div>
  );
};

export default Received;
