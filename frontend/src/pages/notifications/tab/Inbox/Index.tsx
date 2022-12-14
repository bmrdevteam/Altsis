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
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/enrollment.module.scss";

import _ from "lodash";

import Mailbox from "../components/mailbox";

type Props = {};

const Inbox = (props: Props) => {
  const database = useDatabase();

  const { currentUser } = useAuth();

  const [notificationList, setNotificationList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [start, setStart] = useState<number>(0);

  async function getNotificationList() {
    const { notifications } = await database.R({
      location: `notifications?type=received&userId=${currentUser.userId}`,
    });

    return _.sortBy(notifications, "createdAt").reverse();
  }

  useEffect(() => {
    if (isLoading) {
      getNotificationList().then((res: any) => {
        setNotificationList(res);
        setIsLoading(false);
      });
    }
  }, [isLoading]);

  return !isLoading ? (
    <div className={style.section}>
      <Mailbox
        type="received"
        data={notificationList}
        setData={setNotificationList}
        setIsLoading={setIsLoading}
        start={start}
        setStart={setStart}
      />
    </div>
  ) : (
    <></>
  );
};

export default Inbox;
