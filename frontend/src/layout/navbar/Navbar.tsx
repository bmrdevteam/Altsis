/**
 * notification component
 *
 * @returns notification component
 *
 * @example <Notification/>
 */

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "contexts/authContext";
import useInterval from "hooks/useInterval";
import { useNavigate } from "react-router-dom";

// components
import Button from "components/button/Button";
import Select from "components/select/Select";

import Svg from "assets/svg/Svg";
import style from "./navbar.module.scss";

import _ from "lodash";

import audioURL from "assets/audio/notification-a.mp3";
import useApi from "hooks/useApi";

const Notification = () => {
  /**
   * active state for notification contents
   */
  const { currentUser, currentNotifications, setCurrentNotifications } =
    useAuth();
  const { NotificationApi } = useApi();
  const navigate = useNavigate();

  const [notificationContentActive, setNotificationContentActive] =
    useState(false);

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

  useInterval(() => {
    NotificationApi.CUpdatedNotifications(currentUser.userId).then((res) => {
      if (res) {
        audio.play().catch((e: any) => {
          console.log(e);
        });
        setCurrentNotifications([...res]);
        console.log(res);
      }
    });
  }, 1000 * 60 * 10); //10분

  useEffect(() => {
    document.addEventListener("mousedown", handleMousedown);
    return () => {
      document.removeEventListener("mousedown", handleMousedown);
    };
  }, []);

  return (
    <div className={style.notification} ref={notificationtRef}>
      <div
        className={`${style.icon} ${
          currentNotifications.length > 0 && style.active
        }`}
        onClick={() => {
          setNotificationContentActive((prev) => !prev);
        }}
        data-count={
          currentNotifications.length > 0 ? currentNotifications.length : ""
        }
      >
        <Svg type="notification" width="20px" height="20px" />
      </div>

      {notificationContentActive && (
        <div className={style.contents}>
          <div className={style.title}>알림</div>
          {_.sortBy(currentNotifications, "createdAt").map(
            (notification: any) => {
              return (
                <div className={style.item} style={{ marginBottom: "12px" }}>
                  <div className={style.description}>
                    {notification.category && (
                      <span className={style.type}>
                        [{notification.category}]
                      </span>
                    )}
                    {notification.title}
                  </div>
                  <Button
                    type="ghost"
                    onClick={(e: any) => {
                      NotificationApi.UCheckNotification(notification._id)
                        .then(() => {
                          currentNotifications.splice(
                            _.findIndex(
                              currentNotifications,
                              (x: any) => x._id === notification._id
                            ),
                            1
                          );

                          setCurrentNotifications([...currentNotifications]);
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
            }
          )}

          <Button
            type="ghost"
            onClick={(e: any) => {
              navigate("/notifications");
            }}
            style={{
              border: 0,
              color: "gray",
            }}
          >
            모두보기
          </Button>
        </div>
      )}
    </div>
  );
};

type Props = { title?: string };

/**
 * Navbar component
 *
 * @param title the title in
 *
 * @returns Navbar component
 */
const Navbar = (props: Props) => {
  const { registrations, currentRegistration, changeCurrentSeason } = useAuth();
  return (
    <div className={style.navbar_container}>
      {props.title && <div className={style.title}>{props.title}</div>}
      <input className={style.search} type="text" placeholder="검색" />
      <div className={style.menu_item} style={{ paddingLeft: "24px" }}>
        <Select
          appearence="flat"
          options={registrations?.map((value: any, index: number) => {
            return { text: `${value.year} ${value.term}`, value: value };
          })}
          defaultSelectedValue={currentRegistration}
          onChange={(value: any) => {
            console.log(value);
            changeCurrentSeason(value);
          }}
        />
      </div>
      <div className={style.controls}>
        <Notification />
      </div>
    </div>
  );
};

export default Navbar;
