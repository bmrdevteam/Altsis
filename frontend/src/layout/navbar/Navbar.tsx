/**
 * notification component
 *
 * @returns notification component
 *
 * @example <Notification/>
 */

import { useEffect, useRef, useState } from "react";
import { useAuth } from "contexts/authContext";
import { useNavigate } from "react-router-dom";

// components
import Button from "components/button/Button";
import Select from "components/select/Select";

import Svg from "assets/svg/Svg";
import style from "./navbar.module.scss";

import _ from "lodash";

import audioURL from "assets/audio/notification-a.mp3";
import useApi from "hooks/useApi";

import View from "pages/notifications/popup/View";
import Autofill from "components/input/Autofill";
import useOutsideClick from "hooks/useOutsideClick";

const Notification = () => {
  /**
   * active state for notification contents
   */
  const { currentUser, currentNotifications, setCurrentNotifications, socket } =
    useAuth();
  const { NotificationApi } = useApi();
  const navigate = useNavigate();

  const [notificationContentActive, setNotificationContentActive] =
    useState(false);
  const [notificationPopupActive, setNotificationPopupAcitve] = useState(false);

  const [isNotificationLoading, setIsNotifiationLoading] = useState(false);
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

  // useInterval(() => {
  //   NotificationApi.CUpdatedNotifications(currentUser.userId).then((res) => {
  //     if (res) {
  //       audio.play().catch((e: any) => {
  //         // console.log(e);
  //       });
  //       setCurrentNotifications([...res]);
  //       // console.log(res);
  //     }
  //   });
  // }, 1000 * 60 * 10); //10분

  useEffect(() => {
    if (isNotificationLoading) {
      NotificationApi.RNotifications({
        type: "received",
        user: currentUser._id,
        checked: false,
      }).then((res) => {
        if (res) {
          audio.play().catch((e: any) => {
            // console.log(e);
          });
          setCurrentNotifications(res);
          setIsNotifiationLoading(false);
        }
      });
    }

    return () => {};
  }, [isNotificationLoading]);

  useEffect(() => {
    const socketHandler = () => setIsNotifiationLoading(true);
    if (socket) {
      socket.on("checkNotifications", socketHandler);
      socket.emit("login", {
        academyId: currentUser.academyId,
        userId: currentUser.userId,
      });
    }

    return () => {};
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
    return currentNotifications.map((notification: any) => {
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
                  currentNotifications.splice(
                    _.findIndex(
                      currentNotifications,
                      (x: any) => x._id === notification._id
                    ),
                    1
                  );
                  setCurrentNotifications(currentNotifications);
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

        {notificationContentActive && !isNotificationLoading && (
          <>
            <div className={style.contents}>
              <div className={style.title}>알림</div>
              {!isNotificationContenLoading && notifications()}

              <Button
                type="ghost"
                onClick={(e: any) => {
                  setNotificationContentActive(false);
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

type Props = { title?: string };

/**
 * Navbar component
 *
 * @param title the title in
 *
 * @returns Navbar component
 */
const Navbar = (props: Props) => {
  const {
    registrations,
    currentRegistration,
    changeCurrentSeason,
    currentSchool,
    currentSeason,
  } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Array<any>>([]);
  const [searchParam, setSearchParam] = useState<string>("");
  const outsideClick = useOutsideClick();

  const submit = (value: string | number) => {
    navigate(`/search/${value}`);
  };

  useEffect(() => {
    if (!currentSchool || !currentSeason || !currentSeason.registrations)
      return;

    const users = currentSeason.registrations.map((user: any) => {
      return {
        text: `${user.userName} / ${user.userId}`,
        value: user.user,
      };
    });
    setUsers(users);
  }, [currentSchool, currentSeason]);

  // useEffect(() => {
  //   if (!currentSchool || !currentSeason) return;

  //   RegistrationApi.RRegistrations({
  //     season: currentSeason._id,
  //     school: currentSchool.school,
  //   })
  //     .then((result) => {
  //       const users = result.map((user: any) => {
  //         return {
  //           text: `${user.userName} / ${user.userId}`,
  //           value: user.userId,
  //         };
  //       });
  //       setUsers(users);
  //     })
  //     .catch((error) => console.error(error));
  // }, [currentSchool, currentSeason]);

  return (
    <div className={style.navbar_container}>
      {props.title && <div className={style.title}>{props.title}</div>}
      {/* <UserSearchBox /> */}
      <div className={style.user_search} ref={outsideClick.RefObject}>
        <input
          type="text"
          onClick={() => outsideClick.handleOnClick()}
          className={style.search}
          placeholder={"검색"}
          value={searchParam}
          onChange={(e) => {
            setSearchParam(e.target.value ?? "");
          }}
          onKeyUp={(e) => {
            if (e.key === "Enter") {
              setSearchParam(
                users.filter((val: any) => val.text?.includes(searchParam))[0]
                  .text ?? ""
              );
              users.filter((val: any) => val.text?.includes(searchParam))[0]
                .value &&
                submit(
                  users.filter((val: any) => val.text?.includes(searchParam))[0]
                    .value
                );
              outsideClick.setActive(false);
            }
          }}
        />
        {outsideClick.active && (
          <div className={style.result}>
            {users
              .filter((val: any) => val.text?.includes(searchParam))
              .map((val: any, ind: any) => {
                return (
                  <div
                    className={style.row}
                    key={`${ind}${val.text}`}
                    onClick={() => {
                      setSearchParam(val.text);
                      submit(val.value);
                      outsideClick.setActive(false);
                    }}
                  >
                    {val.text}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div className={style.menu_item} style={{ paddingLeft: "24px" }}>
        <Select
          appearence="flat"
          options={registrations?.map((value: any, index: number) => {
            return { text: `${value.year} ${value.term}`, value: value };
          })}
          defaultSelectedValue={currentRegistration}
          onChange={(value: any) => {
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
