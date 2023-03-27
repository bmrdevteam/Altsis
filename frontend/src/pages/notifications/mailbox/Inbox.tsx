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

type Props = {};

const Received = (props: Props) => {
  const { currentUser } = useAuth();
  const { NotificationApi } = useApi();

  const [notificationList, setNotificationList] = useState<any[]>([]);
  const [notification, setNotification] = useState<any>();
  const selectRef = useRef<string[]>();

  const [notificatnionPopupActive, setNotificatnionPopupActive] =
    useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isLoading) {
      NotificationApi.RNotifications({
        type: "received",
        user: currentUser._id,
      })
        .then((res: any) => {
          setNotificationList(
            res.map((val: any) => {
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
              onClick={() => {
                if (_.isEmpty(selectRef.current)) {
                  alert("select notifications to delete");
                } else {
                  NotificationApi.DNotifications(selectRef.current || [])
                    .then((res: any) => {
                      setIsLoading(true);
                      alert(SUCCESS_MESSAGE);
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
                NotificationApi.RNotificationById(e._id)
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
          type={"received"}
        />
      )}
    </div>
  );
};

export default Received;
