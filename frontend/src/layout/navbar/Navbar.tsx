/**
 * notification component
 *
 * @returns notification component
 *
 * @example <Notification/>
 */

import React, { useEffect, useRef, useState } from "react";
import useDatabase from "hooks/useDatabase";
import { useAuth } from "contexts/authContext";

// components
import Button from "components/button/Button";
import Select from "components/select/Select";

import Svg from "../../assets/svg/Svg";
import style from "./navbar.module.scss";

import _ from "lodash";

const Notification = () => {
  /**
   * active state for notification contents
   */
  const { currentNotifications, setCurrentNotifications } = useAuth();
  const database = useDatabase();

  const [notificationContentActive, setNotificationContentActive] =
    useState(false);

  const notificationtRef = useRef<HTMLDivElement>(null);

  function handleMousedown(e: MouseEvent) {
    if (
      notificationtRef.current &&
      !notificationtRef.current.contains(e.target as Node)
    ) {
      setNotificationContentActive(false);
    }
  }

  async function checkNotification(_id: string) {
    const res = await database.U({
      location: `notifications/${_id}/check`,
      data: {},
    });
    return res;
  }

  useEffect(() => {
    document.addEventListener("mousedown", handleMousedown);

    console.log(
      "currentNotifications: ",
      currentNotifications ? currentNotifications : ""
    );

    return () => {
      document.removeEventListener("mousedown", handleMousedown);
    };
  }, []);

  return (
    <div className={style.notification} ref={notificationtRef}>
      <div
        className={style.icon}
        onClick={() => {
          setNotificationContentActive((prev) => !prev);
        }}
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
                    {notification.type && (
                      <span className={style.type}>[{notification.type}]</span>
                    )}
                    {notification.message}
                  </div>
                  <Button
                    type="ghost"
                    onClick={(e: any) => {
                      checkNotification(notification._id)
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
