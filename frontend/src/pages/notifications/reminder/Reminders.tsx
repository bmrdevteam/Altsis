import { useEffect, useState } from "react";
import { useAuth } from "contexts/authContext";
import { useAppNavigate } from "hooks/useAppNavigate";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TUpcomingReminder, TReminder, TEventReminder } from "types/reminder";
import Svg from "assets/svg/Svg";
import style from "./reminders.module.scss";

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

const Reminders = () => {
  const { currentUser } = useAuth();
  const { ReminderAPI } = useAPIv2();
  const navigate = useAppNavigate();

  const [upcomingReminders, setUpcomingReminders] = useState<
    TUpcomingReminder[]
  >([]);
  const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderMemo, setReminderMemo] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");

  const loadReminders = async () => {
    try {
      const { reminders } = await ReminderAPI.RUpcomingReminders();
      setUpcomingReminders((reminders ?? []) as TUpcomingReminder[]);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  useEffect(() => {
    if (currentUser?._id) {
      loadReminders();
    }
  }, [currentUser?._id]);

  const handleCompleteReminder = async (
    e: React.MouseEvent,
    reminderId: string
  ) => {
    e.stopPropagation();
    try {
      await ReminderAPI.UCompleteReminder({ params: { _id: reminderId } });
      setUpcomingReminders((prev) =>
        prev.filter(
          (r) =>
            !(
              r.type === "standalone" &&
              (r.data as TReminder)._id === reminderId
            )
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
          (r) =>
            !(
              r.type === "standalone" &&
              (r.data as TReminder)._id === reminderId
            )
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
          reminderTime: new Date(
            `${reminderDate}T${reminderTime}:00`
          ).toISOString(),
        },
      });
      setReminderTitle("");
      setReminderMemo("");
      setReminderDate("");
      setReminderTime("");
      setIsReminderFormOpen(false);
      loadReminders();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const todayStr = (() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(today.getDate()).padStart(2, "0")}`;
  })();

  return (
    <div className={style.container}>
      <div className={style.header}>
        <h3 className={style.title}>리마인더</h3>
        {!isReminderFormOpen && (
          <button
            className={style.addBtn}
            onClick={() => {
              setReminderDate(todayStr);
              setIsReminderFormOpen(true);
            }}
          >
            + 새 리마인더
          </button>
        )}
      </div>

      {isReminderFormOpen && (
        <div className={style.form}>
          <input
            className={style.input}
            type="text"
            placeholder="제목"
            value={reminderTitle}
            onChange={(e) => setReminderTitle(e.target.value)}
          />
          <textarea
            className={style.textarea}
            placeholder="메모 (선택)"
            rows={2}
            value={reminderMemo}
            onChange={(e) => setReminderMemo(e.target.value)}
          />
          <div className={style.dateTime}>
            <input
              className={style.input}
              type="date"
              value={reminderDate || todayStr}
              onChange={(e) => setReminderDate(e.target.value)}
            />
            <input
              className={style.input}
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>
          <div className={style.formActions}>
            <button
              className={style.btn}
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
              className={`${style.btn} ${style.btnPrimary}`}
              onClick={handleCreateReminder}
              disabled={!reminderTitle.trim() || !reminderTime}
            >
              저장
            </button>
          </div>
        </div>
      )}

      <div className={style.list}>
        {upcomingReminders.length === 0 && (
          <div className={style.empty}>24시간 이내 리마인더가 없습니다</div>
        )}
        {upcomingReminders.map((reminder, idx) => {
          if (reminder.type === "standalone") {
            const data = reminder.data as TReminder;
            return (
              <div key={`reminder-standalone-${idx}`} className={style.item}>
                <div className={style.itemContent}>
                  <div className={style.itemTitle}>{data.title}</div>
                  {data.memo && (
                    <div className={style.itemMemo}>{data.memo}</div>
                  )}
                  <div className={style.itemTime}>
                    {formatTimeUntil(data.reminderTime)}
                  </div>
                </div>
                <div className={style.itemActions}>
                  <div
                    onClick={(e) => handleCompleteReminder(e, data._id)}
                    title="완료"
                    className={style.actionBtn}
                  >
                    <Svg type="check" width="16px" height="16px" />
                  </div>
                  <div
                    onClick={(e) => handleDeleteReminder(e, data._id)}
                    title="삭제"
                    className={style.actionBtn}
                  >
                    <Svg type="x" width="16px" height="16px" />
                  </div>
                </div>
              </div>
            );
          } else {
            const data = reminder.data as TEventReminder;
            return (
              <div
                key={`reminder-event-${idx}`}
                className={style.item}
                onClick={() => navigate("/")}
              >
                <div className={style.itemContent}>
                  <div className={style.itemTitle}>
                    {data.color && (
                      <span
                        className={style.colorDot}
                        style={{ backgroundColor: data.color }}
                      />
                    )}
                    {data.title}
                  </div>
                  <div className={style.itemMemo}>
                    {formatEventTime(data.eventStart)} 시작
                    {data.isRecurring && " (반복)"}
                  </div>
                  <div className={style.itemTime}>
                    {formatTimeUntil(data.reminderTime)}
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};

export default Reminders;
