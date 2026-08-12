import { useEffect, useState } from "react";
import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Textarea from "components/textarea/Textarea";
import Button from "components/button/Button";
import Select from "components/select/Select";
import ColorPicker from "components/colorPicker/ColorPicker";
import style from "./style.module.scss";
import { useAuth } from "contexts/authContext";
import useAPIv2 from "hooks/useAPIv2";

type Props = {
  setPopupActive: (active: boolean) => void;
  onSave: (data: EventFormData) => void;
  defaultValues?: EventFormData;
  mode?: "create" | "edit";
  seasonPeriodEnd?: string;
};

export type EventFormData = {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isAllDay: boolean;
  scope: "school" | "personal";
  recurrenceType: "none" | "daily" | "weekly" | "monthly";
  recurrenceEndDate: string;
  color: string;
  calendarId?: string;
  daysOfWeek?: number[];
  reminder?: {
    enabled: boolean;
    minutesBefore?: number;
    useDefault?: boolean;
  };
  /** 일정 시작 알림 (기본 OFF) */
  scheduleStart?: {
    enabled: boolean;
  };
  /** 학교 전체 알림 (학교 캘린더만, 기본 OFF) */
  notifySchool?: boolean;
};


const Index = (props: Props) => {
  const { currentUser, currentSchool } = useAuth();
  const { UserCalendarAPI, NotificationAPI } = useAPIv2();
  const isManager =
    currentUser?.auth === "admin" || currentUser?.auth === "manager";

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [title, setTitle] = useState(props.defaultValues?.title ?? "");
  const [description, setDescription] = useState(
    props.defaultValues?.description ?? ""
  );
  const [startDate, setStartDate] = useState(
    props.defaultValues?.startDate ?? todayStr
  );
  const [startTime, setStartTime] = useState(
    props.defaultValues?.startTime ?? "09:00"
  );
  const [endDate, setEndDate] = useState(
    props.defaultValues?.endDate ?? todayStr
  );
  const [endTime, setEndTime] = useState(
    props.defaultValues?.endTime ?? "10:00"
  );
  const [isAllDay, setIsAllDay] = useState(
    props.defaultValues?.isAllDay ?? false
  );
  const [scope, setScope] = useState<"school" | "personal">(
    props.defaultValues?.scope ?? "personal"
  );
  const [recurrenceType, setRecurrenceType] = useState<
    "none" | "daily" | "weekly" | "monthly"
  >(props.defaultValues?.recurrenceType ?? "none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    props.defaultValues?.recurrenceEndDate ?? ""
  );
  const [color, setColor] = useState(
    props.defaultValues?.color ?? "#4285f4"
  );
  const [calendarId, setCalendarId] = useState(
    props.defaultValues?.calendarId ?? ""
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    props.defaultValues?.daysOfWeek ?? []
  );

  // 리마인더 상태
  const [reminderEnabled, setReminderEnabled] = useState(
    props.defaultValues?.reminder?.enabled ?? false
  );
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<
    number | "default"
  >(
    props.defaultValues?.reminder?.useDefault !== false
      ? "default"
      : props.defaultValues?.reminder?.minutesBefore ?? 15
  );
  const [defaultReminderMinutes, setDefaultReminderMinutes] = useState(15);
  const [scheduleStartEnabled, setScheduleStartEnabled] = useState(
    props.defaultValues?.scheduleStart?.enabled ?? false
  );
  const [notifySchool, setNotifySchool] = useState(
    props.defaultValues?.notifySchool ?? false
  );

  const [userCalendars, setUserCalendars] = useState<any[]>([]);

  useEffect(() => {
    UserCalendarAPI.RUserCalendars({
      query: { school: currentSchool?._id },
    })
      .then(({ userCalendars }) => {
        setUserCalendars(userCalendars);
      })
      .catch(() => {});

    // 기본 리마인더 설정 로드
    NotificationAPI.RNotificationSettings()
      .then(({ settings }) => {
        if (settings.eventReminderDefault) {
          setDefaultReminderMinutes(settings.eventReminderDefault);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-select start date's day when switching to weekly with no days selected
  useEffect(() => {
    if (recurrenceType === "weekly" && daysOfWeek.length === 0) {
      const dayOfWeek = new Date(startDate).getDay();
      setDaysOfWeek([dayOfWeek]);
    }
  }, [recurrenceType]);

  // Sync endDate with startDate for daily recurrence
  useEffect(() => {
    if (recurrenceType === "daily") {
      setEndDate(startDate);
    }
  }, [recurrenceType, startDate]);

  // Default recurrence end date to semester end (only if it's after start date)
  useEffect(() => {
    if (recurrenceType !== "none" && !recurrenceEndDate && props.seasonPeriodEnd) {
      if (props.seasonPeriodEnd >= startDate) {
        setRecurrenceEndDate(props.seasonPeriodEnd);
      }
    }
  }, [recurrenceType]);

  const calendarOptions = () => {
    const options: { text: string; value: string }[] = [
      { text: "개인 캘린더", value: "__personal" },
    ];
    if (isManager) {
      options.push({ text: "학교 캘린더", value: "__school" });
    }
    const schoolCalendars = userCalendars.filter((c) => c.scope === "school");
    const personalCalendars = userCalendars.filter(
      (c) => c.scope === "personal"
    );
    for (const cal of schoolCalendars) {
      options.push({ text: `[학교] ${cal.name}`, value: cal._id });
    }
    for (const cal of personalCalendars) {
      options.push({ text: cal.name, value: cal._id });
    }
    return options;
  };

  const selectedCalendar = calendarId || (scope === "school" ? "__school" : "__personal");

  const handleCalendarChange = (val: string) => {
    if (val === "__personal") {
      setScope("personal");
      setCalendarId("");
      setNotifySchool(false);
    } else if (val === "__school") {
      setScope("school");
      setCalendarId("");
    } else {
      const cal = userCalendars.find((c) => c._id === val);
      if (cal) {
        setScope(cal.scope);
        setCalendarId(cal._id);
        setColor(cal.color);
        if (cal.scope !== "school") {
          setNotifySchool(false);
        }
      }
    }
  };

  const isRecurrenceEndDateInvalid =
    recurrenceType !== "none" &&
    !!recurrenceEndDate &&
    recurrenceEndDate < startDate;

  const handleSave = () => {
    if (!title.trim()) return;
    if (recurrenceType === "weekly" && daysOfWeek.length === 0) return;
    if (isRecurrenceEndDateInvalid) return;

    let effectiveStartDate = startDate;
    let effectiveEndDate = endDate;

    if (recurrenceType === "weekly") {
      effectiveEndDate = effectiveStartDate;
    } else if (recurrenceType === "daily") {
      effectiveEndDate = effectiveStartDate;
    }

    props.onSave({
      title,
      description,
      startDate: effectiveStartDate,
      startTime,
      endDate: effectiveEndDate,
      endTime,
      isAllDay,
      scope,
      recurrenceType,
      recurrenceEndDate,
      color,
      calendarId: calendarId || undefined,
      daysOfWeek: recurrenceType === "weekly" ? daysOfWeek : undefined,
      reminder: reminderEnabled
        ? {
            enabled: true,
            minutesBefore:
              reminderMinutesBefore === "default"
                ? undefined
                : reminderMinutesBefore,
            useDefault: reminderMinutesBefore === "default",
          }
        : { enabled: false },
      scheduleStart: { enabled: !isAllDay && scheduleStartEnabled },
      notifySchool: scope === "school" && notifySchool,
    });
  };

  return (
    <Popup
      setState={props.setPopupActive}
      style={{
        width: "480px",
        display: "flex",
        flexDirection: "column",
      }}
      closeBtn
      contentScroll
      title={props.mode === "edit" ? "일정 수정" : "일정 추가"}
      footer={
        <div className={style.footer}>
          <Button
            type="ghost"
            onClick={() => props.setPopupActive(false)}
          >
            취소
          </Button>
          <Button
            type="ghost"
            onClick={handleSave}
            disabled={
              !title.trim() ||
              (recurrenceType === "weekly" && daysOfWeek.length === 0) ||
              isRecurrenceEndDateInvalid
            }
          >
            {props.mode === "edit" ? "수정" : "저장"}
          </Button>
        </div>
      }
    >
      <div className={style.content}>
        <div className={style.row}>
          <Input
            label="제목"
            type="text"
            required
            defaultValue={title}
            onChange={(e: any) => setTitle(e.target.value)}
            placeholder="일정 제목을 입력하세요"
          />
        </div>

        <div className={style.rowInline}>
          <div style={{ flex: 1 }}>
            <Select
              label="캘린더"
              options={calendarOptions()}
              defaultSelectedValue={selectedCalendar}
              onChange={(e: any) => handleCalendarChange(e)}
            />
          </div>
          <ColorPicker value={color} onChange={setColor} />
          <label className={style.checkbox}>
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
            />
            종일
          </label>
        </div>

        <div className={style.row}>
          <Select
            label="반복"
            options={[
              { text: "반복 없음", value: "none" },
              { text: "매일", value: "daily" },
              { text: "매주", value: "weekly" },
              { text: "매월", value: "monthly" },
            ]}
            defaultSelectedValue={recurrenceType}
            onChange={(e: any) => setRecurrenceType(e)}
          />
        </div>

        {recurrenceType === "weekly" ? (
          <div className={style.dateGroup}>
            <div className={style.dateRow}>
              <span className={style.dateLabel}>요일</span>
              <div className={style.dayOfWeekSelector}>
                {["일", "월", "화", "수", "목", "금", "토"].map(
                  (dayLabel, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`${style.dayChip} ${
                        daysOfWeek.includes(idx) ? style.dayChipSelected : ""
                      }`}
                      onClick={() =>
                        setDaysOfWeek((prev) =>
                          prev.includes(idx)
                            ? prev.filter((d) => d !== idx)
                            : [...prev, idx].sort()
                        )
                      }
                    >
                      {dayLabel}
                    </button>
                  )
                )}
              </div>
            </div>
            {!isAllDay && (
              <>
                <div className={style.dateRow}>
                  <span className={style.dateLabel}>시작</span>
                  <Input
                    type="time"
                    defaultValue={startTime}
                    onChange={(e: any) => setStartTime(e.target.value)}
                  />
                </div>
                <div className={style.dateRow}>
                  <span className={style.dateLabel}>종료</span>
                  <Input
                    type="time"
                    defaultValue={endTime}
                    onChange={(e: any) => setEndTime(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        ) : recurrenceType === "daily" ? (
          <div className={style.dateGroup}>
            <div className={style.dateRow}>
              <span className={style.dateLabel}>시작</span>
              <Input
                type="date"
                defaultValue={startDate}
                onChange={(e: any) => {
                  setStartDate(e.target.value);
                  setEndDate(e.target.value);
                }}
              />
              {!isAllDay && (
                <Input
                  type="time"
                  defaultValue={startTime}
                  onChange={(e: any) => setStartTime(e.target.value)}
                />
              )}
            </div>
            <div className={style.dateRow}>
              <span className={style.dateLabel}>종료</span>
              <Input
                type="date"
                value={endDate}
                onChange={() => {}}
                disabled
              />
              {!isAllDay && (
                <Input
                  type="time"
                  defaultValue={endTime}
                  onChange={(e: any) => setEndTime(e.target.value)}
                />
              )}
            </div>
          </div>
        ) : (
          <div className={style.dateGroup}>
            <div className={style.dateRow}>
              <span className={style.dateLabel}>시작</span>
              <Input
                type="date"
                defaultValue={startDate}
                onChange={(e: any) => setStartDate(e.target.value)}
              />
              {!isAllDay && (
                <Input
                  type="time"
                  defaultValue={startTime}
                  onChange={(e: any) => setStartTime(e.target.value)}
                />
              )}
            </div>
            <div className={style.dateRow}>
              <span className={style.dateLabel}>종료</span>
              <Input
                type="date"
                defaultValue={endDate}
                onChange={(e: any) => setEndDate(e.target.value)}
              />
              {!isAllDay && (
                <Input
                  type="time"
                  defaultValue={endTime}
                  onChange={(e: any) => setEndTime(e.target.value)}
                />
              )}
            </div>
          </div>
        )}

        {recurrenceType !== "none" && (
          <>
            <div className={style.row}>
              <Input
                label="반복 시작일"
                type="date"
                defaultValue={startDate}
                onChange={(e: any) => setStartDate(e.target.value)}
              />
            </div>
            <div className={style.row}>
              <Input
                label="반복 종료일"
                type="date"
                value={recurrenceEndDate}
                onChange={(e: any) => setRecurrenceEndDate(e.target.value)}
              />
            </div>
          </>
        )}

        {!isAllDay && (
          <>
            <div className={style.rowInline}>
              <label className={style.checkbox}>
                <input
                  type="checkbox"
                  checked={scheduleStartEnabled}
                  onChange={(e) => setScheduleStartEnabled(e.target.checked)}
                />
                일정 시작 알림
              </label>
            </div>
            <div className={style.rowInline}>
              <label className={style.checkbox}>
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                />
                리마인더
              </label>
              {reminderEnabled && (
                <div style={{ flex: 1 }}>
                  <Select
                    options={[
                      {
                        text: `기본 설정 (${defaultReminderMinutes}분 전)`,
                        value: "default",
                      },
                      { text: "15분 전", value: "15" },
                      { text: "30분 전", value: "30" },
                      { text: "1시간 전", value: "60" },
                      { text: "1일 전", value: "1440" },
                    ]}
                    defaultSelectedValue={String(reminderMinutesBefore)}
                    onChange={(e: any) => {
                      setReminderMinutesBefore(
                        e === "default" ? "default" : Number(e)
                      );
                    }}
                  />
                </div>
              )}
            </div>
            {scope === "school" && (
              <div className={style.row}>
                <label className={style.checkbox}>
                  <input
                    type="checkbox"
                    checked={notifySchool}
                    onChange={(e) => setNotifySchool(e.target.checked)}
                  />
                  학교 전체 알림
                </label>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--accent-3)",
                    marginTop: 4,
                    lineHeight: 1.4,
                  }}
                >
                  켜면 학교 구성원에게도 일정 시작·리마인더가 갈 수 있습니다.
                  각자 알림 설정을 따릅니다.
                </div>
              </div>
            )}
          </>
        )}

        <div className={style.row}>
          <Textarea
            label="설명"
            rows={2}
            defaultValue={description}
            onChange={(e: any) => setDescription(e.target.value)}
            placeholder="일정 설명 (선택)"
          />
        </div>
      </div>
    </Popup>
  );
};

export default Index;
