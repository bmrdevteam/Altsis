import React, { memo, useEffect, useState } from "react";
import Svg from "../../assets/svg/Svg";
import style from "./calendar.module.scss";

import Select from "components/select/Select";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import {
  Calendar,
  DateItem,
  EventItem,
} from "./calendarData";

import WeeklyView from "./view/WeeklyViewer/Index";
import MonthlyView from "./view/MonthlyViewer/Index";
import Loading from "components/loading/Loading";
import EventPopup from "./view/EventPopup/Index";
import SettingPopup from "./view/SettingPopup/Index";
import EventFormPopup, {
  EventFormData,
} from "./view/EventFormPopup/Index";

type Props = {
  userId?: string;
  readOnly?: boolean;
};

type Mode = "day" | "week" | "month";

const VISIBILITY_KEY = "calendarVisibility";

const getVisibility = (): Record<string, boolean> => {
  try {
    const stored = window.localStorage.getItem(VISIBILITY_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
};

const formatPeriod = (period?: { start?: string; end?: string }): string => {
  if (!period?.start || !period?.end) return "";
  const fmt = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
  };
  return `(${fmt(period.start)} ~ ${fmt(period.end)})`;
};

const getHeaderLabels = (
  dateItem: DateItem,
  mode: Mode,
  registration?: any,
  season?: any
): { title: string; subTitle: string } => {
  const periodText = formatPeriod(season?.period);
  const semesterLabel =
    registration?.year && registration?.term
      ? `${registration.year} ${registration.term}${periodText ? ` ${periodText}` : ""}`
      : "";

  switch (mode) {
    case "day":
      return {
        title: `${dateItem.formatText(4)}`,
        subTitle: semesterLabel,
      };
    case "week": {
      // Calculate monthly week number using mid-week (Wednesday) to determine month
      const midWeek = dateItem.getDateItemAfter(3);
      const year = midWeek.yyyy;
      const month = midWeek.mm;
      const firstOfMonth = new DateItem({
        fields: { yyyy: year, mm: month, dd: 1 },
      });
      const firstSunday = firstOfMonth.getDateItemBefore(
        firstOfMonth.getDay()
      );
      const diffMs =
        dateItem._date.getTime() - firstSunday._date.getTime();
      const weekNum =
        Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;

      const dateRange = `${dateItem.formatText(3)} ~ ${dateItem
        .getDateItemAfter(6)
        .formatText(3)}`;
      return {
        title: `${year}년 ${month}월 ${weekNum}주차`,
        subTitle: semesterLabel || dateRange,
      };
    }
    case "month":
      return {
        title: `${dateItem.formatText(2)}`,
        subTitle: semesterLabel,
      };
  }
  return { title: "", subTitle: "" };
};

const Viewer = memo(
  ({
    mode,
    calendar,
    dateItem,
    isMounted,
    setEvent,
    setIsEventPopupActive,
    onClickCreate,
  }: {
    mode: Mode;
    calendar: Calendar;
    dateItem: DateItem;
    isMounted: boolean;
    setEvent: React.Dispatch<React.SetStateAction<EventItem | undefined>>;
    setIsEventPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
    onClickCreate?: (date: string, time?: string) => void;
  }) => {
    const onClickEventHandler = (event: EventItem) => {
      setEvent(event);
      setIsEventPopupActive(true);
    };

    const handleClickCreateWeekly = (date: string, time: string) => {
      onClickCreate?.(date, time);
    };

    const handleClickCreateMonthly = (date: string) => {
      onClickCreate?.(date);
    };

    if (mode === "day") {
      return (
        <WeeklyView
          eventMap={calendar?.getEventMap(dateItem, dateItem)}
          isMounted={isMounted}
          dayList={[dateItem.getDayString()]}
          onClickEvent={onClickEventHandler}
          onClickCreate={handleClickCreateWeekly}
        />
      );
    }

    if (mode === "week") {
      return (
        <WeeklyView
          eventMap={calendar?.getEventMap(
            dateItem,
            dateItem.getDateItemAfter(6)
          )}
          isMounted={isMounted}
          dayList={["일", "월", "화", "수", "목", "금", "토"]}
          onClickEvent={onClickEventHandler}
          onClickCreate={handleClickCreateWeekly}
        />
      );
    }
    if (mode === "month") {
      return (
        <MonthlyView
          year={dateItem.yyyy}
          month={dateItem.mm}
          eventMap={calendar?.getFullMonthlyEventMap(dateItem)}
          onClickEvent={onClickEventHandler}
          onClickCreate={handleClickCreateMonthly}
        />
      );
    }
    return <></>;
  }
);

const Calender = (props: Props) => {
  const { currentRegistration, currentSchool, currentUser, currentSeason } = useAuth();
  const { CalendarEventAPI } = useAPIv2();
  const [hasSynced, setHasSynced] = useState(false);

  const [mode, setMode] = useState<Mode>("week");

  const [calendar, setCalendar] = useState<Calendar>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(true);

  const today = new DateItem({ date: new Date() });
  const [dateItem, setDateItem] = useState<DateItem>(today);

  const [isEventPopupActive, setIsEventPopupActive] = useState<boolean>(false);
  const [event, setEvent] = useState<EventItem>();

  const [isSettingPopupActive, setIsSettingPopupActive] =
    useState<boolean>(false);

  const [isEventFormPopupActive, setIsEventFormPopupActive] =
    useState<boolean>(false);
  const [eventFormMode, setEventFormMode] = useState<"create" | "edit">(
    "create"
  );
  const [eventFormDefaults, setEventFormDefaults] = useState<
    EventFormData | undefined
  >();
  const [editingEventId, setEditingEventId] = useState<string | undefined>();

  const filterEventsByVisibility = (events: any[]): any[] => {
    const vis = getVisibility();
    return events.filter((e) => {
      // Determine the category key
      let categoryKey: string;
      if (e.sourceType === "enrollment") categoryKey = "enrollments";
      else if (e.sourceType === "syllabus") categoryKey = "mentorings";
      else if (e.sourceType === "memo") categoryKey = "memos";
      else if (e.scope === "school") categoryKey = "schoolCalendar";
      else categoryKey = "personalCalendar";

      // Check custom calendar visibility
      if (e.calendarId) {
        const customKey = `custom_${e.calendarId}`;
        if (vis[customKey] === false) return false;
      }

      // Default to visible if not explicitly set to false
      return vis[categoryKey] !== false;
    });
  };

  const updateCalendar = async (year: number) => {
    setIsLoading(true);

    // sync enrollment/syllabus events on first load
    if (!hasSynced && currentRegistration?.season) {
      try {
        await CalendarEventAPI.SyncCalendarEvents({
          data: {
            season: currentRegistration.season,
            ...(props.userId ? { targetUser: props.userId } : {}),
          },
        });
        setHasSynced(true);
      } catch (err: any) {
        if (err?.response?.data?.message !== "REGISTRATION_NOT_FOUND") {
          ALERT_ERROR(err);
        }
        setHasSynced(true);
      }
    }

    const calendar = new Calendar({ year });
    const startDate = new Date(year, 0, 1).toISOString();
    const endDate = new Date(year, 11, 31).toISOString();

    try {
      const { calendarEvents } = await CalendarEventAPI.RCalendarEvents({
        query: {
          startDate,
          endDate,
          ...(props.userId ? { user: props.userId } : {}),
        },
      });

      const filtered = filterEventsByVisibility(calendarEvents);

      const schoolEvents = filtered.filter(
        (e: any) => e.scope === "school"
      );
      const personalEvents = filtered.filter(
        (e: any) => e.scope === "personal"
      );

      if (schoolEvents.length > 0) {
        calendar.addCustomEvents(schoolEvents, "schoolCalendar");
      }
      if (personalEvents.length > 0) {
        calendar.addCustomEvents(personalEvents, "personalCalendar");
      }
      calendar.mergeConsecutiveRecurrenceInstances();
    } catch (err) {
      ALERT_ERROR(err);
    }

    setCalendar(calendar);
    setIsLoading(false);
  };

  const handleEventFormSave = async (formData: EventFormData) => {
    try {
      const startDateTime = formData.isAllDay
        ? new Date(formData.startDate).toISOString()
        : new Date(`${formData.startDate}T${formData.startTime}`).toISOString();
      const endDateTime = formData.isAllDay
        ? new Date(formData.endDate).toISOString()
        : new Date(`${formData.endDate}T${formData.endTime}`).toISOString();

      if (eventFormMode === "edit" && editingEventId) {
        await CalendarEventAPI.UCalendarEvent({
          params: { _id: editingEventId },
          data: {
            title: formData.title,
            description: formData.description,
            start: startDateTime,
            end: endDateTime,
            isAllDay: formData.isAllDay,
            recurrence: {
              type: formData.recurrenceType,
              endDate:
                formData.recurrenceType !== "none" && formData.recurrenceEndDate
                  ? new Date(formData.recurrenceEndDate).toISOString()
                  : undefined,
              days:
                formData.recurrenceType === "weekly"
                  ? formData.daysOfWeek
                  : undefined,
            },
            color: formData.color,
            calendarId: formData.calendarId,
          },
        });
      } else {
        await CalendarEventAPI.CCalendarEvent({
          data: {
            title: formData.title,
            description: formData.description,
            start: startDateTime,
            end: endDateTime,
            isAllDay: formData.isAllDay,
            scope: formData.scope,
            school:
              formData.scope === "school" ? currentSchool?._id : undefined,
            recurrence: {
              type: formData.recurrenceType,
              endDate:
                formData.recurrenceType !== "none" && formData.recurrenceEndDate
                  ? new Date(formData.recurrenceEndDate).toISOString()
                  : undefined,
              days:
                formData.recurrenceType === "weekly"
                  ? formData.daysOfWeek
                  : undefined,
            },
            color: formData.color,
            calendarId: formData.calendarId,
          },
        });
      }

      setIsEventFormPopupActive(false);
      setEditingEventId(undefined);
      setEventFormDefaults(undefined);
      updateCalendar(dateItem.yyyy);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleEventEdit = (eventItem: EventItem) => {
    setIsEventPopupActive(false);

    // Parse event data into form defaults
    const startParts = eventItem.startTimeText.split(" ");
    const endParts = eventItem.endTimeText.split(" ");

    const defaults: EventFormData = {
      title: eventItem.title.replace(/\(\d+\/\d+\)$/, "").trim(),
      description: eventItem.description || "",
      startDate: startParts[0],
      startTime: startParts[1] || "09:00",
      endDate: endParts[0],
      endTime: endParts[1] || "10:00",
      isAllDay: eventItem.isAllday,
      scope: eventItem.scope || "personal",
      recurrenceType: eventItem.recurrenceType || "none",
      recurrenceEndDate: eventItem.recurrenceEndDate || "",
      color: eventItem.color || "#4285f4",
      calendarId: eventItem.calendarId,
      daysOfWeek: eventItem.recurrenceDays || [],
    };

    const eventId = eventItem.recurrenceParentId || eventItem.eventId;
    setEditingEventId(eventId);
    setEventFormMode("edit");
    setEventFormDefaults(defaults);
    setIsEventFormPopupActive(true);
  };

  const handleEventDelete = async (eventId: string) => {
    try {
      await CalendarEventAPI.DCalendarEvent({ params: { _id: eventId } });
      setIsEventPopupActive(false);
      updateCalendar(dateItem.yyyy);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleClickCreate = (date: string, time?: string) => {
    const endHour = time
      ? String(parseInt(time.split(":")[0]) + 1).padStart(2, "0") + ":00"
      : "10:00";

    setEventFormMode("create");
    setEditingEventId(undefined);
    setEventFormDefaults({
      title: "",
      description: "",
      startDate: date,
      startTime: time || "09:00",
      endDate: date,
      endTime: endHour,
      isAllDay: !time,
      scope: "personal",
      recurrenceType: "none",
      recurrenceEndDate: "",
      color: "#4285f4",
    });
    setIsEventFormPopupActive(true);
  };

  const onClickNavHandler = (navProps: {
    cmd: "left" | "right" | "center";
    mode: Mode;
  }) => {
    if (!dateItem) return;
    setIsMounted(false);

    let _date: DateItem = dateItem;

    if (navProps.mode === "month") {
      if (navProps.cmd === "center") {
        _date = new DateItem({
          fields: {
            yyyy: today.yyyy,
            mm: today.mm,
            dd: 1,
          },
        });
      } else if (navProps.cmd === "left") {
        _date = new DateItem({
          fields: {
            yyyy: dateItem.yyyy,
            mm: dateItem.mm - 1,
            dd: 1,
          },
        });
      } else {
        _date = new DateItem({
          fields: {
            yyyy: dateItem.yyyy,
            mm: dateItem.mm + 1,
            dd: 1,
          },
        });
      }
    } else if (navProps.mode === "week") {
      if (navProps.cmd === "center") {
        _date = new DateItem({
          fields: {
            yyyy: today.yyyy,
            mm: today.mm,
            dd: today.dd - today.getDay(),
          },
        });
      } else if (navProps.cmd === "left") {
        _date = dateItem.getDateItemBefore(7);
      } else {
        _date = dateItem.getDateItemAfter(7);
      }
    } else if (navProps.mode === "day") {
      if (navProps.cmd === "center") {
        _date = today;
      } else if (navProps.cmd === "left") {
        _date = dateItem.getDateItemBefore(1);
      } else {
        _date = dateItem.getDateItemAfter(1);
      }
    }

    if (_date.yyyy !== dateItem.yyyy) {
      updateCalendar(_date.yyyy).then(() => {
        setIsMounted(false);
        setTimeout(() => {
          setIsMounted(true);
          setDateItem(_date);
        }, 50);
      });
    } else {
      setIsMounted(false);
      setTimeout(() => {
        setIsMounted(true);
        setDateItem(_date);
      }, 50);
    }
  };

  useEffect(() => {
    const _mode = window.localStorage.getItem("calendarMode");
    if (_mode && (_mode === "day" || _mode === "week" || _mode === "month")) {
      setMode(_mode);
    } else {
      window.localStorage.setItem("calendarMode", "week");
    }

    updateCalendar(dateItem.yyyy);
    return () => {};
  }, []);

  useEffect(() => {
    if (mode === "day") {
      if (dateItem.mm === today.mm) {
        setDateItem(today);
      }
    } else if (mode === "week") {
      setDateItem(today.getDateItemBefore(today.getDay()));
    } else if (mode === "month") {
      setDateItem(
        new DateItem({
          fields: { yyyy: today.yyyy, mm: today.mm, dd: 1 },
        })
      );
    }

    return () => {};
  }, [mode]);

  const headerLabels = getHeaderLabels(dateItem, mode, currentRegistration, currentSeason);

  return (
    <>
      <div
        className={style.calender_container}
        style={{ maxWidth: mode === "month" ? "100%" : "100%" }}
      >
        <div className={style.calender}>
          <div className={style.top}>
            <div className={style.header}>
              <div className={style.title}>{headerLabels.title}</div>
              {headerLabels.subTitle && (
                <div className={style.subTitle}>{headerLabels.subTitle}</div>
              )}
            </div>
            <div className={style.controls}>
              {!props.readOnly && (
                <div
                  className={style.svgBtn}
                  onClick={() => {
                    setEventFormMode("create");
                    setEditingEventId(undefined);
                    setEventFormDefaults(undefined);
                    setIsEventFormPopupActive(true);
                  }}
                  title="일정추가"
                >
                  <Svg type="plus" width="20px" height="20px" />
                </div>
              )}
              <div className={style.btn}>
                <div
                  className={style.subBtn}
                  onClick={() => onClickNavHandler({ cmd: "left", mode })}
                >
                  <Svg type={"chevronLeft"} />
                </div>

                <div
                  className={style.subBtn}
                  onClick={() => onClickNavHandler({ cmd: "center", mode })}
                >
                  오늘
                </div>

                <div
                  className={style.subBtn}
                  onClick={() => onClickNavHandler({ cmd: "right", mode })}
                >
                  <Svg type={"chevronRight"} />
                </div>
              </div>
              <div className={style.selector}>
                <Select
                  options={[
                    { text: "일", value: "day" },
                    { text: "주", value: "week" },
                    { text: "월", value: "month" },
                  ]}
                  onChange={(val: Mode) => {
                    setMode(val);
                  }}
                  defaultSelectedValue={mode}
                />
              </div>
              <div
                className={style.svgBtn}
                onClick={() => {
                  updateCalendar(dateItem.yyyy);
                }}
              >
                <Svg type="refresh" width="20px" height="20px" />
              </div>
              <div
                className={style.svgBtn}
                onClick={() => setIsSettingPopupActive(true)}
              >
                <Svg type="gear" width="20px" height="20px" />
              </div>
            </div>
          </div>
          <div className={style.viewer_container}>
            {!isLoading && calendar ? (
              <Viewer
                mode={mode}
                calendar={calendar!}
                dateItem={dateItem}
                isMounted={isMounted}
                setEvent={setEvent}
                setIsEventPopupActive={setIsEventPopupActive}
                onClickCreate={props.readOnly ? undefined : handleClickCreate}
              />
            ) : (
              <Loading height={"calc(100vh - 200px)"} />
            )}
          </div>
        </div>
      </div>
      {isEventPopupActive && event && (
        <EventPopup
          setPopupActive={setIsEventPopupActive}
          event={event}
          onDelete={props.readOnly ? undefined : handleEventDelete}
          onEdit={props.readOnly ? undefined : handleEventEdit}
          readOnly={props.readOnly}
        />
      )}
      {isSettingPopupActive && (
        <SettingPopup
          setPopupActive={setIsSettingPopupActive}
          onVisibilityChange={() => updateCalendar(dateItem.yyyy)}
          userId={props.userId}
        />
      )}
      {isEventFormPopupActive && (
        <EventFormPopup
          setPopupActive={(active: boolean) => {
            setIsEventFormPopupActive(active);
            if (!active) {
              setEditingEventId(undefined);
              setEventFormDefaults(undefined);
            }
          }}
          onSave={handleEventFormSave}
          mode={eventFormMode}
          defaultValues={eventFormDefaults}
          seasonPeriodEnd={currentSeason?.period?.end}
        />
      )}
    </>
  );
};

export default Calender;
