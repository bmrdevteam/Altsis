import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Socket, io } from "socket.io-client";
import style from "./navbar.module.scss";
import _ from "lodash";

// hooks
import { useAuth } from "contexts/authContext";

// components
import Svg from "assets/svg/Svg";

import audioURL from "assets/audio/notification-a.mp3";
import { TNotificationReceived } from "types/notification";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

function formatNotificationTime(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}/${day}`;
}

const Notification = () => {
  const { currentUser } = useAuth();
  const { NotificationAPI, PostAPI, EnrollmentAPI } = useAPIv2();

  const navigate = useNavigate();

  const [socket, setSocket] = useState<Socket>();

  const [notifications, setNotifications] = useState<TNotificationReceived[]>(
    []
  );

  const [isNotificationLoading, setIsNotifiationLoading] = useState(false);
  const [isNotificationContenLoading, setIsNotifiationContenLoading] =
    useState(false);

  const notificationDivRef = useRef<HTMLDivElement>(null);

  const [notificationContentActive, setNotificationContentActive] =
    useState(false);

  const [soundEnabled, setSoundEnabled] = useState(true);

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
      // 알림 설정 조회
      NotificationAPI.RNotificationSettings()
        .then(({ settings }) => {
          setSoundEnabled(settings.soundEnabled ?? true);
        })
        .catch(() => {
          // 설정 조회 실패 시 기본값 사용
        });
    }
  }, [currentUser]);

  useEffect(() => {
    // currentUser가 로드되지 않았으면 소켓 연결하지 않음
    if (!currentUser?.academyId || !currentUser?.userId) {
      return;
    }

    //* setup socket */
    const newSocket = io(`${process.env.REACT_APP_SERVER_URL}`, {
      path: "/io/notification",
      withCredentials: true,
    });

    newSocket.on("connect", () => {
      newSocket.emit("listening", {
        academyId: currentUser.academyId,
        userId: currentUser.userId,
      });
    });

    newSocket.on("listen", () => {
      setIsNotifiationLoading(true);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [currentUser?.academyId, currentUser?.userId]);

  useEffect(() => {
    if (isNotificationLoading) {
      updateNotifications().then(() => {
        if (soundEnabled) {
          audio.play().catch(() => {
            // 자동 재생 정책에 의해 재생이 차단될 수 있음
          });
        }
        setIsNotifiationLoading(false);
      });
    }
    return () => {};
  }, [isNotificationLoading, soundEnabled]);

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

  const handleNotificationClick = async (notification: TNotificationReceived) => {
    // 알림을 확인 처리
    try {
      await NotificationAPI.UCheckNotification({
        params: { _id: notification._id },
      });
      setNotifications((prev) =>
        prev.filter((n) => n._id !== notification._id)
      );
    } catch (err) {
      ALERT_ERROR(err);
    }

    // 관련 게시글이 있으면 해당 게시글로 이동
    if (notification.relatedEntity?.type === "post") {
      try {
        const { post } = await PostAPI.RPost({
          params: { _id: notification.relatedEntity.id },
        });
        setNotificationContentActive(false);
        navigate(`/boards/${post.board}/post/${post._id}`);
      } catch (err) {
        // 게시글을 찾을 수 없으면 게시판 목록으로 이동
        setNotificationContentActive(false);
        navigate("/boards");
      }
    }
    // 수업 관련 알림 (수업 초대)
    else if (notification.relatedEntity?.type === "enrollment") {
      try {
        const { enrollment } = await EnrollmentAPI.REnrollment({
          params: { _id: notification.relatedEntity.id },
        });
        setNotificationContentActive(false);
        navigate(`/courses/enrolled/${enrollment.syllabus}`);
      } catch (err) {
        // 수강 정보를 찾을 수 없으면 수업 목록으로 이동
        setNotificationContentActive(false);
        navigate("/courses");
      }
    }
    // 수업 관련 알림 (수업 취소, 승인, 승인 취소)
    else if (notification.relatedEntity?.type === "syllabus") {
      setNotificationContentActive(false);
      // 수업 취소 알림은 학생이 받으므로 enrolled 경로로
      if (notification.notificationType === "classCancellation") {
        navigate("/courses");
      }
      // 승인/승인취소 알림은 교사가 받으므로 created 경로로
      else if (notification.notificationType === "classApproval" || notification.notificationType === "classApprovalCancel") {
        navigate(`/courses/created/${notification.relatedEntity.id}`);
      } else {
        navigate(`/courses/${notification.relatedEntity.id}`);
      }
    }
    // 일정 시작 알림
    else if (notification.relatedEntity?.type === "calendarEvent") {
      setNotificationContentActive(false);
      navigate("/");
    }
    else {
      setNotificationContentActive(false);
      navigate("/boards");
    }
  };

  const handleCheckNotification = async (
    e: React.MouseEvent,
    notification: TNotificationReceived
  ) => {
    e.stopPropagation();
    try {
      await NotificationAPI.UCheckNotification({
        params: { _id: notification._id },
      });
      setNotifications((prev) =>
        prev.filter((n) => n._id !== notification._id)
      );
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const notificationItems = () => {
    return notifications.map((notification: TNotificationReceived, idx: number) => {
      return (
        <div
          key={`notificationItem-${idx}`}
          className={style.item}
          onClick={() => handleNotificationClick(notification)}
        >
          <div className={style.description}>
            {notification.category && (
              <span className={style.type}>[{notification.category}]</span>
            )}
            {notification.title}
          </div>
          <div className={style.time}>
            {formatNotificationTime(notification.date)}
          </div>
          <div
            onClick={(e) => handleCheckNotification(e, notification)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              padding: "2px",
              cursor: "pointer",
              color: "gray",
              flexShrink: 0,
            }}
            title="확인"
          >
            <Svg type="check" width="14px" height="14px" />
          </div>
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
        <div className={style.contents}>
          <div
            className={style.title}
            style={{
              display: "flex",
              gap: "4px",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <Svg type="notification" width="20px" height="20px" />
              알림
            </div>
            {notifications.length > 0 && (
              <div
                onClick={async () => {
                  try {
                    await NotificationAPI.UBulkCheckNotifications();
                    setNotifications([]);
                  } catch (err) {
                    ALERT_ERROR(err);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  padding: "4px",
                  color: "var(--accent-1)",
                }}
                title="일괄 확인"
              >
                <Svg type="check" width="20px" height="20px" />
              </div>
            )}
          </div>
          <div className={style.item_box}>
            {!isNotificationContenLoading && notificationItems()}
          </div>
          <div
            className={style.button}
            style={{ display: "flex", justifyContent: "center" }}
          >
            <div
              onClick={() => {
                setNotificationContentActive(false);
                navigate("/boards");
              }}
              style={{
                cursor: "pointer",
                padding: "8px 16px",
                color: "var(--accent-1)",
                fontSize: "14px",
              }}
            >
              게시판 보기
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notification;
