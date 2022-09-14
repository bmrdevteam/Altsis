import React, { useEffect, useRef, useState } from "react";
import Svg from "../../assets/svg/Svg";
import style from "./navbar.module.scss";

/**
 * notification component
 *
 * @returns notification component
 *
 * @example <Notification/>
 */
const Notification = () => {
  /**
   * active state for notification contents
   */
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
  useEffect(() => {
    document.addEventListener("mousedown", handleMousedown);
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
          <div className={style.item}>
            <div className={style.description}>
              <span className={style.type}>[수업]</span>
              세계관의 기초 수업의 강의실이 변경 되었습니다
            </div>
            <div className={style.x}>
              <Svg type={"x"} />
            </div>
          </div>
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
  return (
    <div className={style.navbar_container}>
      {props.title && <div className={style.title}>{props.title}</div>}
      <input className={style.search} type="text" placeholder="검색" />
      <div className={style.menu_item}></div>
      <div className={style.controls}>
        <Notification />
      </div>
    </div>
  );
};

export default Navbar;
