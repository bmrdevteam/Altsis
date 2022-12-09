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
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/enrollment.module.scss";

// components
import Popup from "components/popup/Popup";
import Button from "components/button/Button";

import _ from "lodash";

import Mailbox from "../components/mailbox";

type Props = {};

const Inbox = (props: Props) => {
  const database = useDatabase();

  const { currentUser } = useAuth();

  const [notificationList, setNotificationList] = useState<any[]>([]);
  const [pageInfo, setPageInfo] = useState<any>({
    requestPage: 1,
    requestSize: 10,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function getNotificationList() {
    const { notifications, page } = await database.R({
      location: `notifications?type=received&userId=${currentUser.userId}&page=${pageInfo.requestPage}&size=${pageInfo.requestSize}`,
    });

    return { notifications, page };
  }

  async function deleteNotifications(ids: string[]) {
    const res = await database.D({
      location: `notifications/${_.join(ids, "&")}`,
    });
    return res;
  }

  useEffect(() => {
    if (isLoading) {
      getNotificationList().then((res: any) => {
        setNotificationList(
          res.notifications.map((notification: any) => {
            return {
              ...notification,
              fromUser: `${notification.fromUserName}(${notification.fromUserId})`,
            };
          })
        );
        setPageInfo(res.page);
      });
      setIsLoading(false);
    }
  }, [isLoading]);

  return !isLoading ? (
    <div className={style.section}>
      <Mailbox
        type="received"
        data={notificationList}
        pageInfo={pageInfo}
        setPageInfo={setPageInfo}
        deleteNotifications={deleteNotifications}
        setIsLoading={setIsLoading}
      />
    </div>
  ) : (
    <></>
  );
};

export default Inbox;
