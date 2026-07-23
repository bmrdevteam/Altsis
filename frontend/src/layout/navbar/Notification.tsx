import { useEffect, useRef, useState } from "react";
import { useAppNavigate } from "hooks/useAppNavigate";
import { io } from "socket.io-client";
import style from "./navbar.module.scss";
import _ from "lodash";

// hooks
import { useAuth } from "contexts/authContext";

// components
import Svg from "assets/svg/Svg";

import audioURL from "assets/audio/notification-a.mp3";
import { TNotificationReceived } from "types/notification";
import { TUpcomingReminder, TReminder, TEventReminder } from "types/reminder";
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

function formatTimeUntil(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = d.getTime() - now.getTime();

  if (diffMs <= 0) return "지금";

  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return "1분 이내";
  if (diffMin < 60) return `${diffMin}분 후`;
  if (diffHour < 24) {
    const remainMin = diffMin % 60;
    if (remainMin === 0) return `${diffHour}시간 후`;
    return `${diffHour}시간 ${remainMin}분 후`;
  }

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const minute = String(d.getMinutes()).padStart(2, "0");
  const ampm = hour < 12 ? "오전" : "오후";
  const h12 = hour % 12 || 12;
  return `${month}/${day} ${ampm} ${h12}:${minute}`;
}

function formatEventTime(date: Date | string): string {
  const d = new Date(date);
  const hour = d.getHours();
  const minute = String(d.getMinutes()).padStart(2, "0");
  const ampm = hour < 12 ? "오전" : "오후";
  const h12 = hour % 12 || 12;
  return `${ampm} ${h12}:${minute}`;
}

const Notification = () => {
  const { currentUser } = useAuth();
  const { NotificationAPI, ReminderAPI, PostAPI, EnrollmentAPI, AltSheetRowAPI } =
    useAPIv2();

  const navigate = useAppNavigate();

  const [notifications, setNotifications] = useState<TNotificationReceived[]>(
    []
  );

  const notificationDivRef = useRef<HTMLDivElement>(null);

  const [notificationContentActive, setNotificationContentActive] =
    useState(false);

  const [soundEnabled, setSoundEnabled] = useState(true);

  // 탭 상태
  const [activeTab, setActiveTab] = useState<"notifications" | "reminders">(
    "notifications"
  );

  // 리마인더 상태
  const [upcomingReminders, setUpcomingReminders] = useState<
    TUpcomingReminder[]
  >([]);
  const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderMemo, setReminderMemo] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");

  // 알림 상세 보기 상태
  const [expandedNotificationId, setExpandedNotificationId] = useState<
    string | null
  >(null);
  const [expandedDescription, setExpandedDescription] = useState<
    string | null
  >(null);
  const [loadingDescription, setLoadingDescription] = useState(false);

  // ref로 관리하여 socket 이벤트 핸들러에서 항상 최신 값/함수 참조
  const audioRef = useRef(new Audio(audioURL));
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

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

  const loadReminders = async () => {
    try {
      const { reminders } = await ReminderAPI.RUpcomingReminders();
      setUpcomingReminders((reminders ?? []) as TUpcomingReminder[]);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // socket 이벤트 핸들러에서 항상 최신 함수를 호출하기 위한 ref
  const updateNotificationsRef = useRef(updateNotifications);
  updateNotificationsRef.current = updateNotifications;

  const loadRemindersRef = useRef(loadReminders);
  loadRemindersRef.current = loadReminders;

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
      // 재연결 시 누락된 알림 갱신
      updateNotificationsRef.current();
      loadRemindersRef.current();
    });

    newSocket.on("connect_error", (err) => {
      console.error("[Notification] Socket connection error:", err.message);
    });

    newSocket.on("disconnect", (reason) => {});

    // listen 이벤트 수신 시 직접 알림 갱신
    newSocket.on("listen", () => {
      updateNotificationsRef.current();
      if (soundEnabledRef.current) {
        audioRef.current.play().catch(() => {
          // 자동 재생 정책에 의해 재생이 차단될 수 있음
        });
      }
      loadRemindersRef.current();
    });

    return () => {
      newSocket.close();
    };
  }, [currentUser?.academyId, currentUser?.userId]);

  useEffect(() => {
    document.addEventListener("mousedown", handleMousedown);
    return () => {
      document.removeEventListener("mousedown", handleMousedown);
    };
  }, []);

  // 드롭다운 열릴 때 또는 탭 전환 시 데이터 로드
  useEffect(() => {
    if (notificationContentActive) {
      if (activeTab === "notifications") {
        updateNotifications();
      } else if (activeTab === "reminders") {
        loadReminders();
      }
    }
  }, [notificationContentActive, activeTab]);

  const isNavigableNotification = (
    notification: TNotificationReceived
  ): boolean => {
    if (!notification.relatedEntity) return false;
    const navigableTypes = [
      "post",
      "enrollment",
      "syllabus",
      "calendarEvent",
      "reminder",
      "altSheetRow",
    ];
    return navigableTypes.includes(notification.relatedEntity.type);
  };

  const handleNotificationClick = async (
    notification: TNotificationReceived
  ) => {
    // navigable 알림: 기존 동작 (확인 처리 + 페이지 이동)
    if (isNavigableNotification(notification)) {
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

      if (notification.relatedEntity?.type === "post") {
        try {
          const { post } = await PostAPI.RPost({
            params: { _id: notification.relatedEntity.id },
          });
          setNotificationContentActive(false);
          navigate(`/boards/${post.board}/post/${post._id}`);
        } catch (err) {
          setNotificationContentActive(false);
          navigate("/boards");
        }
      } else if (notification.relatedEntity?.type === "enrollment") {
        try {
          const { enrollment } = await EnrollmentAPI.REnrollment({
            params: { _id: notification.relatedEntity.id },
          });
          setNotificationContentActive(false);
          navigate(`/courses/enrolled/${enrollment.syllabus}`);
        } catch (err) {
          setNotificationContentActive(false);
          navigate("/courses");
        }
      } else if (notification.relatedEntity?.type === "syllabus") {
        setNotificationContentActive(false);
        if (notification.notificationType === "classCancellation") {
          navigate("/courses");
        } else if (
          notification.notificationType === "classApproval" ||
          notification.notificationType === "classApprovalCancel"
        ) {
          navigate(`/courses/created/${notification.relatedEntity.id}`);
        } else {
          navigate(`/courses/${notification.relatedEntity.id}`);
        }
      } else if (
        notification.relatedEntity?.type === "calendarEvent" ||
        notification.relatedEntity?.type === "reminder"
      ) {
        setNotificationContentActive(false);
        navigate("/");
      } else if (notification.relatedEntity?.type === "altSheetRow") {
        try {
          const { boardId, row } = await AltSheetRowAPI.RAltSheetRow({
            params: { _id: notification.relatedEntity.id },
          });
          setNotificationContentActive(false);
          const rowId = row?._id || notification.relatedEntity.id;
          navigate(
            `/boards/${boardId}?approval=${encodeURIComponent(String(rowId))}#활동`
          );
        } catch (err) {
          setNotificationContentActive(false);
          navigate("/boards");
        }
      }
      return;
    }

    // non-navigable 알림: 인라인 상세 보기 토글
    if (expandedNotificationId === notification._id) {
      setExpandedNotificationId(null);
      setExpandedDescription(null);
    } else {
      setExpandedNotificationId(notification._id);
      setExpandedDescription(null);
      setLoadingDescription(true);
      try {
        const { notification: full } = await NotificationAPI.RNotification({
          params: { _id: notification._id },
        });
        setExpandedDescription(
          (full as TNotificationReceived).description || null
        );
      } catch {
        setExpandedDescription(null);
      } finally {
        setLoadingDescription(false);
      }
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

  const handleCompleteReminder = async (
    e: React.MouseEvent,
    reminderId: string
  ) => {
    e.stopPropagation();
    try {
      await ReminderAPI.UCompleteReminder({ params: { _id: reminderId } });
      setUpcomingReminders((prev) =>
        prev.filter(
          (r) => !(r.type === "standalone" && (r.data as TReminder)._id === reminderId)
        )
      );
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleDeleteReminder = async (
    e: React.MouseEvent,
    reminderId: string
  ) => {
    e.stopPropagation();
    try {
      await ReminderAPI.DReminder({ params: { _id: reminderId } });
      setUpcomingReminders((prev) =>
        prev.filter(
          (r) => !(r.type === "standalone" && (r.data as TReminder)._id === reminderId)
        )
      );
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleCreateReminder = async () => {
    if (!reminderTitle.trim() || !reminderDate || !reminderTime) return;

    try {
      await ReminderAPI.CReminder({
        data: {
          title: reminderTitle,
          memo: reminderMemo,
          reminderTime: new Date(`${reminderDate}T${reminderTime}:00`).toISOString(),
        },
      });
      // 폼 초기화
      setReminderTitle("");
      setReminderMemo("");
      setReminderDate("");
      setReminderTime("");
      setIsReminderFormOpen(false);
      // 리마인더 목록 갱신
      loadReminders();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const notificationItems = () => {
    return notifications.map(
      (notification: TNotificationReceived, idx: number) => {
        const isExpanded = expandedNotificationId === notification._id;
        const navigable = isNavigableNotification(notification);

        return (
          <div
            key={`notificationItem-${idx}`}
            className={`${style.item} ${isExpanded ? style.itemExpanded : ""}`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className={style.itemHeader}>
              <div className={style.description}>
                {notification.category && (
                  <span className={style.type}>[{notification.category}]</span>
                )}
                {notification.title}
              </div>
              <div className={style.time}>
                {formatNotificationTime(notification.date)}
              </div>
              {!navigable && (
                <div className={style.expandIndicator}>
                  <Svg
                    type={isExpanded ? "chevronUp" : "chevronDown"}
                    width="12px"
                    height="12px"
                  />
                </div>
              )}
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
            {isExpanded && (
              <div className={style.notificationDetail}>
                {loadingDescription ? (
                  <div className={style.notificationDetailLoading}>
                    로딩 중...
                  </div>
                ) : expandedDescription ? (
                  <div className={style.notificationDetailContent}>
                    {expandedDescription}
                  </div>
                ) : (
                  <div className={style.notificationDetailEmpty}>
                    상세 내용이 없습니다
                  </div>
                )}
                {notification.fromUserName && (
                  <div className={style.notificationDetailMeta}>
                    보낸 사람: {notification.fromUserName}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }
    );
  };

  const reminderItems = () => {
    if (upcomingReminders.length === 0) {
      return (
        <div className={style.emptyState}>24시간 이내 리마인더가 없습니다</div>
      );
    }

    return upcomingReminders.map((reminder, idx) => {
      if (reminder.type === "standalone") {
        const data = reminder.data as TReminder;
        return (
          <div key={`reminder-standalone-${idx}`} className={style.reminderItem}>
            <div className={style.reminderContent}>
              <div className={style.reminderTitle}>{data.title}</div>
              {data.memo && (
                <div className={style.reminderMemo}>{data.memo}</div>
              )}
              <div className={style.reminderTime}>
                {formatTimeUntil(data.reminderTime)}
              </div>
            </div>
            <div className={style.reminderActions}>
              <div
                onClick={(e) => handleCompleteReminder(e, data._id)}
                title="완료"
                className={style.reminderActionBtn}
              >
                <Svg type="check" width="14px" height="14px" />
              </div>
              <div
                onClick={(e) => handleDeleteReminder(e, data._id)}
                title="삭제"
                className={style.reminderActionBtn}
              >
                <Svg type="x" width="14px" height="14px" />
              </div>
            </div>
          </div>
        );
      } else {
        const data = reminder.data as TEventReminder;
        return (
          <div
            key={`reminder-event-${idx}`}
            className={style.reminderItem}
            onClick={() => {
              setNotificationContentActive(false);
              navigate("/");
            }}
          >
            <div className={style.reminderContent}>
              <div className={style.reminderTitle}>
                {data.color && (
                  <span
                    className={style.reminderColorDot}
                    style={{ backgroundColor: data.color }}
                  />
                )}
                {data.title}
              </div>
              <div className={style.reminderMemo}>
                {formatEventTime(data.eventStart)} 시작
                {data.isRecurring && " (반복)"}
              </div>
              <div className={style.reminderTime}>
                {formatTimeUntil(data.reminderTime)}
              </div>
            </div>
          </div>
        );
      }
    });
  };

  const reminderForm = () => {
    if (!isReminderFormOpen) return null;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    return (
      <div className={style.reminderForm}>
        <input
          className={style.reminderInput}
          type="text"
          placeholder="제목"
          value={reminderTitle}
          onChange={(e) => setReminderTitle(e.target.value)}
        />
        <textarea
          className={style.reminderTextarea}
          placeholder="메모 (선택)"
          rows={2}
          value={reminderMemo}
          onChange={(e) => setReminderMemo(e.target.value)}
        />
        <div className={style.reminderDateTime}>
          <input
            className={style.reminderInput}
            type="date"
            value={reminderDate || todayStr}
            onChange={(e) => setReminderDate(e.target.value)}
          />
          <input
            className={style.reminderInput}
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
          />
        </div>
        <div className={style.reminderFormActions}>
          <button
            className={style.reminderBtn}
            onClick={() => {
              setIsReminderFormOpen(false);
              setReminderTitle("");
              setReminderMemo("");
              setReminderDate("");
              setReminderTime("");
            }}
          >
            취소
          </button>
          <button
            className={`${style.reminderBtn} ${style.reminderBtnPrimary}`}
            onClick={handleCreateReminder}
            disabled={!reminderTitle.trim() || !reminderTime}
          >
            저장
          </button>
        </div>
      </div>
    );
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

      {notificationContentActive && (
        <div className={style.contents}>
          {/* 탭 헤더 */}
          <div className={style.tabs}>
            <div
              className={`${style.tab} ${
                activeTab === "notifications" ? style.activeTab : ""
              }`}
              onClick={() => setActiveTab("notifications")}
            >
              알림
              {notifications.length > 0 && ` (${notifications.length})`}
            </div>
            <div
              className={`${style.tab} ${
                activeTab === "reminders" ? style.activeTab : ""
              }`}
              onClick={() => setActiveTab("reminders")}
            >
              리마인더
              {upcomingReminders.length > 0 &&
                ` (${upcomingReminders.length})`}
            </div>
          </div>

          {/* 알림 탭 */}
          {activeTab === "notifications" && (
            <>
              {notifications.length > 0 && (
                <div className={style.tabActions}>
                  <div
                    onClick={async () => {
                      try {
                        await NotificationAPI.UBulkCheckNotifications();
                        setNotifications([]);
                      } catch (err) {
                        ALERT_ERROR(err);
                      }
                    }}
                    className={style.tabActionBtn}
                    title="일괄 확인"
                  >
                    <Svg type="check" width="14px" height="14px" />
                    일괄 확인
                  </div>
                </div>
              )}
              <div className={style.item_box}>
                {notificationItems()}
                {notifications.length === 0 && (
                  <div className={style.emptyState}>새 알림이 없습니다</div>
                )}
              </div>
            </>
          )}

          {/* 리마인더 탭 */}
          {activeTab === "reminders" && (
            <>
              <div className={style.item_box}>
                {reminderItems()}
                {reminderForm()}
                {!isReminderFormOpen && (
                  <div
                    className={style.addReminderBtn}
                    onClick={() => {
                      const today = new Date();
                      const todayStr = `${today.getFullYear()}-${String(
                        today.getMonth() + 1
                      ).padStart(2, "0")}-${String(today.getDate()).padStart(
                        2,
                        "0"
                      )}`;
                      setReminderDate(todayStr);
                      setIsReminderFormOpen(true);
                    }}
                  >
                    + 새 리마인더
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Notification;
