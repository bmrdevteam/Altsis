import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Socket, io } from "socket.io-client";
import style from "./navbar.module.scss";
import _ from "lodash";

// hooks
import { useAuth } from "contexts/authContext";

// components
import Button from "components/button/Button";
import Svg from "assets/svg/Svg";
import View from "pages/notifications/popup/View";

import audioURL from "assets/audio/notification-a.mp3";
import { TNotificationReceived } from "types/notification";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

const Notification = () => {
  const { currentUser } = useAuth();
  const { NotificationAPI } = useAPIv2();
  const navigate = useNavigate();

  const [socket, setSocket] = useState<Socket>();

  const [notifications, setNotifications] = useState<TNotificationReceived[]>(
    []
  );

  const [isNotificationLoading, setIsNotifiationLoading] = useState(false);
  const [isNotificationContenLoading, setIsNotifiationContenLoading] =
    useState(false);
  const [notification, setNotification] = useState<any>();

  const notificationDivRef = useRef<HTMLDivElement>(null);

  const [notificationContentActive, setNotificationContentActive] =
    useState(false);
  const [notificationPopupActive, setNotificationPopupAcitve] = useState(false);

  const audio = new Audio(audioURL);

  function handleMousedown(e: MouseEvent) {
    if (
      notificationDivRef.current &&
      !notificationDivRef.current.contains(e.target as Node)
    ) {
      setNotificationContentActive(false);
    }
  }

  const updateNotifications = async () => {
    if (currentUser?._id) {
      try {
        const { notifications } = await NotificationAPI.RNotifications({
          query: { type: "received", checked: false },
        });
        setNotifications(notifications as TNotificationReceived[]);
      } catch (err) {
        ALERT_ERROR(err);
      }
    }
  };

  useEffect(() => {
    if (currentUser?._id) {
      updateNotifications();
    }
  }, [currentUser]);

  useEffect(() => {
    //* setup socket */
    const socket = io(`${process.env.REACT_APP_SERVER_URL}`, {
      path: "/io/notification",
      withCredentials: true,
    });

    socket.on("connect", () => {
      setSocket(socket);
      socket.emit("listening", {
        academyId: currentUser.academyId,
        userId: currentUser.userId,
      });
    });

    socket.on("listen", () => {
      setIsNotifiationLoading(true);
    });

    setSocket(socket);

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (isNotificationLoading) {
      updateNotifications().then(() => {
        // audio.play().catch((e: any) => {
        //   // console.log(e);
        // });
        setIsNotifiationLoading(false);
      });
    }
    return () => {};
  }, [isNotificationLoading]);

  useEffect(() => {
    document.addEventListener("mousedown", handleMousedown);
    return () => {
      document.removeEventListener("mousedown", handleMousedown);
    };
  }, []);

  useEffect(() => {
    if (isNotificationContenLoading) {
      setIsNotifiationContenLoading(false);
    }
    return () => {};
  }, [isNotificationContenLoading]);

  const notificationItems = () => {
    return notifications.map((notification: any, idx: number) => {
      return (
        <div
          key={`notificationItem-${idx}`}
          className={style.item}
          style={{ marginBottom: "12px" }}
        >
          <div
            className={style.description}
            onClick={() => {
              setNotification(notification);
              setNotificationPopupAcitve(true);
            }}
          >
            {notification.category && (
              <span className={style.type}>[{notification.category}]</span>
            )}
            {notification.title}
          </div>
          <Button
            type="ghost"
            onClick={(e: any) => {
              NotificationAPI.UCheckNotification({
                params: { _id: notification._id },
              })
                .then(() => {
                  notifications.splice(
                    _.findIndex(
                      notifications,
                      (x: any) => x._id === notification._id
                    ),
                    1
                  );
                  setNotifications([...notifications]);
                })
                .catch((err) => {
                  ALERT_ERROR(err);
                });
            }}
            style={{
              border: 0,
              color: "gray",
            }}
          >
            x
          </Button>
        </div>
      );
    });
  };

  return (
    <div className={style.notification} ref={notificationDivRef}>
      <div
        className={`${style.icon} ${notifications.length > 0 && style.active}`}
        onClick={() => {
          setNotificationContentActive((prev) => !prev);
        }}
        data-count={notifications.length > 0 ? notifications.length : ""}
      >
        <Svg type="notification" width="20px" height="20px" />
      </div>

      {notificationContentActive && !isNotificationLoading && (
        <>
          <div className={style.contents}>
            <div className={style.title}>알림</div>
            <div className={style.item_box}>
              {!isNotificationContenLoading && notificationItems()}
            </div>
            <div className={style.button}>
              <Button
                type="ghost"
                onClick={(e: any) => {
                  setNotificationContentActive(false);
                  navigate("/notifications");
                }}
              >
                모두보기
              </Button>
            </div>
          </div>
          {notificationPopupActive && (
            <View
              setState={setNotificationPopupAcitve}
              nid={notification._id}
              type={"received"}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Notification;
