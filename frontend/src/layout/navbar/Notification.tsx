import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Socket, io } from "socket.io-client";
import style from "./navbar.module.scss";
import _ from "lodash";

// hooks
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";

// components
import Button from "components/button/Button";
import Svg from "assets/svg/Svg";
import View from "pages/notifications/popup/View";

import audioURL from "assets/audio/notification-a.mp3";

const Notification = () => {
  const { currentUser, currentNotificationsRef } = useAuth();
  const { NotificationApi } = useApi();
  const navigate = useNavigate();

  const [, setSocket] = useState<Socket>();

  const [notificationContentActive, setNotificationContentActive] =
    useState(false);
  const [notificationPopupActive, setNotificationPopupAcitve] = useState(false);

  const [isNotificationLoading, setIsNotifiationLoading] = useState(true);
  const [isNotificationContenLoading, setIsNotifiationContenLoading] =
    useState(false);
  const [notification, setNotification] = useState<any>();

  const notificationtRef = useRef<HTMLDivElement>(null);

  const audio = new Audio(audioURL);

  function handleMousedown(e: MouseEvent) {
    if (
      notificationtRef.current &&
      !notificationtRef.current.contains(e.target as Node)
    ) {
      setNotificationContentActive(false);
    }
  }

  useEffect(() => {
    if (isNotificationLoading) {
      NotificationApi.RNotifications({
        type: "received",
        user: currentUser._id,
        checked: false,
      }).then((res) => {
        if (res) {
          // audio.play().catch((e: any) => {
          //   // console.log(e);
          // });
          currentNotificationsRef.current = res;
          setIsNotifiationLoading(false);
        }
      });
    }

    return () => {};
  }, [isNotificationLoading]);

  useEffect(() => {
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

  const notifications = () => {
    return currentNotificationsRef.current.map((notification: any) => {
      return (
        <div className={style.item} style={{ marginBottom: "12px" }}>
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
              NotificationApi.UCheckNotification(notification._id)
                .then(() => {
                  currentNotificationsRef.current.splice(
                    _.findIndex(
                      currentNotificationsRef.current,
                      (x: any) => x._id === notification._id
                    ),
                    1
                  );
                  setIsNotifiationContenLoading(true);
                })
                .catch((err) => {
                  alert(err.response.data.message);
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
    <>
      <div className={style.notification} ref={notificationtRef}>
        <div
          className={`${style.icon} ${
            currentNotificationsRef.current.length > 0 && style.active
          }`}
          onClick={() => {
            setNotificationContentActive((prev) => !prev);
          }}
          data-count={
            currentNotificationsRef.current.length > 0
              ? currentNotificationsRef.current.length
              : ""
          }
        >
          <Svg type="notification" width="20px" height="20px" />
        </div>

        {notificationContentActive && !isNotificationLoading && (
          <>
            <div className={style.contents}>
              <div className={style.title}>알림</div>
              <div className={style.item_box}>
                {!isNotificationContenLoading && notifications()}
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
                data={notification}
                type={"received"}
              />
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Notification;
