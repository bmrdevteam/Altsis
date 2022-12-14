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
import { useEffect, useState } from "react";
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/enrollment.module.scss";

// components
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import Textarea from "components/textarea/Textarea";
import Autofill from "components/input/Autofill";

import _ from "lodash";
import Input from "components/input/Input";

import Mailbox from "../components/mailbox";

import Send from "../../popup/Send";
type Props = {};

const Sent = (props: Props) => {
  const database = useDatabase();

  const { currentUser, currentRegistration } = useAuth();

  const [notificationList, setNotificationList] = useState<any[]>([]);

  const [isRegistratinoListLoaded, setIsRegistrationLoaded] =
    useState<boolean>(false);
  const [receiverOptionList, setReceiverOptionList] = useState<any[]>([]);

  const [sendPopupActive, setSendPopupActive] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [start, setStart] = useState<number>(0);
  async function getNotificationList() {
    const { notifications } = await database.R({
      location: `notifications?type=sent&userId=${currentUser?.userId}`,
    });

    return _.sortBy(notifications, "createdAt").reverse();
  }

  async function getRegistrationList() {
    const { registrations } = await database.R({
      location: `registrations?season=${currentRegistration?.season}`,
    });

    return registrations;
  }

  useEffect(() => {
    if (isLoading) {
      getNotificationList().then((res: any) => {
        setNotificationList(res);
        setIsLoading(false);
      });
    }
  }, [isLoading]);

  useEffect(() => {
    setIsRegistrationLoaded(false);
  }, [currentRegistration]);

  async function updateReceiverOptionList() {
    getRegistrationList().then((res: any) => {
      setReceiverOptionList(
        res.map((registration: any) => {
          return {
            value: JSON.stringify({
              userId: registration.userId,
              userName: registration.userName,
            }),
            text: `${registration.userName}(${registration.userId})`,
          };
        })
      );
    });
  }

  return !isLoading ? (
    <>
      <div className={style.section}>
        <Button
          type="ghost"
          onClick={() => {
            if (!isRegistratinoListLoaded) {
              updateReceiverOptionList().then(() => {
                setIsRegistrationLoaded(true);
              });
            }
            setSendPopupActive(true);
          }}
        >
          알림 보내기
        </Button>
      </div>
      <div className={style.section}>
        <Mailbox
          type="sent"
          data={notificationList}
          setData={setNotificationList}
          setIsLoading={setIsLoading}
          start={start}
          setStart={setStart}
        />
      </div>
      {sendPopupActive && isRegistratinoListLoaded && (
        <Send
          setState={setSendPopupActive}
          receiverOptionList={receiverOptionList}
        />
      )}
    </>
  ) : (
    <></>
  );
};

export default Sent;
