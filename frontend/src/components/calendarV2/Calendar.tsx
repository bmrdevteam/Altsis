import React, { memo, useEffect, useMemo, useRef, useState } from "react";
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
import useRegisterAlterCalendar from "hooks/useRegisterAlterCalendar";

type Props = {
  userId?: string;
  readOnly?: boolean;
  /** Alter chat에 표시할 캘린더 라벨 (조회 대상 일정 등) */
  alterLabel?: string;
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
    customCategoryColors,
    referenceTime,
    visibleDays,
  }: {
    mode: Mode;
    calendar: Calendar;
    dateItem: DateItem;
    isMounted: boolean;
    setEvent: React.Dispatch<React.SetStateAction<EventItem | undefined>>;
    setIsEventPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
    onClickCreate?: (date: string, time?: string) => void;
    customCategoryColors?: Record<string, string>;
    referenceTime?: string | null;
    visibleDays?: number[];
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

    const viewerEventMap = useMemo(() => {
      if (!calendar) return undefined;
      if (mode === "day") return calendar.getEventMap(dateItem, dateItem);
      if (mode === "week") {
        const fullMap = calendar.getEventMap(dateItem, dateItem.getDateItemAfter(6));
        if (!fullMap || !visibleDays || visibleDays.length === 7) return fullMap;
        // Filter out hidden days
        const filtered = new Map<string, EventItem[]>();
        Array.from(fullMap.entries()).forEach(([dateStr, events]) => {
          const day = new Date(dateStr).getDay();
          if (visibleDays.includes(day)) {
            filtered.set(dateStr, events);
          }
        });
        return filtered;
      }
      if (mode === "month") return calendar.getFullMonthlyEventMap(dateItem);
      return undefined;
    }, [calendar, mode, dateItem, visibleDays]);

    if (mode === "day") {
      return (
        <WeeklyView
          eventMap={viewerEventMap}
          isMounted={isMounted}
          dayList={[dateItem.getDayString()]}
          onClickEvent={onClickEventHandler}
          onClickCreate={handleClickCreateWeekly}
          customCategoryColors={customCategoryColors}
          referenceTime={referenceTime}
        />
      );
    }

    if (mode === "week") {
      const allDays = ["일", "월", "화", "수", "목", "금", "토"];
      const filteredDayList =
        visibleDays && visibleDays.length < 7
          ? allDays.filter((_, idx) => visibleDays.includes(idx))
          : allDays;

      return (
        <WeeklyView
          eventMap={viewerEventMap}
          isMounted={isMounted}
          dayList={filteredDayList}
          onClickEvent={onClickEventHandler}
          onClickCreate={handleClickCreateWeekly}
          customCategoryColors={customCategoryColors}
          referenceTime={referenceTime}
        />
      );
    }
    if (mode === "month") {
      return (
        <MonthlyView
          year={dateItem.yyyy}
          month={dateItem.mm}
          eventMap={viewerEventMap}
          onClickEvent={onClickEventHandler}
          onClickCreate={handleClickCreateMonthly}
          customCategoryColors={customCategoryColors}
        />
      );
    }
    return <></>;
  }
);

const CALENDAR_SETTINGS_KEY = "calendarSettings";

const getCalendarSettings = (): {
  visibleDays: number[];
  referenceTime: string | null;
  categoryColors: Record<string, string>;
} => {
  try {
    const stored = window.localStorage.getItem(CALENDAR_SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    visibleDays: [0, 1, 2, 3, 4, 5, 6],
    referenceTime: null,
    categoryColors: {},
  };
};

const saveCalendarSettings = (settings: {
  visibleDays: number[];
  referenceTime: string | null;
  categoryColors: Record<string, string>;
}) => {
  window.localStorage.setItem(
    CALENDAR_SETTINGS_KEY,
    JSON.stringify(settings)
  );
};

const Calender = (props: Props) => {
  const { currentRegistration, currentSchool, currentUser, currentSeason } = useAuth();
  const { CalendarEventAPI, CalendarSettingAPI } = useAPIv2();
  const [hasSynced, setHasSynced] = useState(false);

  const [mode, setMode] = useState<Mode>("week");

  // Calendar settings (visibleDays, referenceTime, categoryColors)
  const [calendarSettings, setCalendarSettings] = useState(getCalendarSettings());

  const [calendar, setCalendar] = useState<Calendar>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(true);

  const today = new DateItem({ date: new Date() });
  const [dateItem, setDateItem] = useState<DateItem>(today);

  // Cache for avoiding redundant fetches
  const rawEventsRef = useRef<any[]>([]);
  const cachedRangeRef = useRef<{ start: string; end: string } | null>(null);

  // Track current view state for background sync callback
  const currentDateRef = useRef<DateItem>(today);
  const currentModeRef = useRef<Mode>("week");

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

  const getVisibleViewRange = (
    targetDate: DateItem,
    viewMode: Mode
  ): { start: string; end: string } => {
    switch (viewMode) {
      case "day": {
        const dayStart = new Date(
          targetDate.yyyy,
          targetDate.mm - 1,
          targetDate.dd,
          0,
          0,
          0,
          0
        );
        const dayEnd = new Date(
          targetDate.yyyy,
          targetDate.mm - 1,
          targetDate.dd,
          23,
          59,
          59,
          999
        );
        return { start: dayStart.toISOString(), end: dayEnd.toISOString() };
      }
      case "week": {
        const weekEnd = targetDate.getDateItemAfter(6);
        const start = new Date(
          targetDate.yyyy,
          targetDate.mm - 1,
          targetDate.dd,
          0,
          0,
          0,
          0
        );
        const end = new Date(
          weekEnd.yyyy,
          weekEnd.mm - 1,
          weekEnd.dd,
          23,
          59,
          59,
          999
        );
        return { start: start.toISOString(), end: end.toISOString() };
      }
      case "month": {
        const start = new Date(targetDate.yyyy, targetDate.mm - 1, 1, 0, 0, 0, 0);
        const end = new Date(targetDate.yyyy, targetDate.mm, 0, 23, 59, 59, 999);
        return { start: start.toISOString(), end: end.toISOString() };
      }
    }
  };

  useRegisterAlterCalendar({
    // readOnly(타인 일정 조회)여도 화면에 로드된 일정은 Alter가 참고할 수 있음
    enabled: true,
    label: props.alterLabel || (props.userId ? "조회 대상 일정" : "캘린더"),
    getEvents: () => filterEventsByVisibility(rawEventsRef.current || []),
    getVisibleRange: () =>
      getVisibleViewRange(currentDateRef.current, currentModeRef.current),
  });

  const getQueryRange = (
    targetDate: DateItem,
    viewMode: Mode
  ): { start: Date; end: Date } => {
    switch (viewMode) {
      case "day":
        // Fetch current ±1 month for quick day navigation
        return {
          start: new Date(targetDate.yyyy, targetDate.mm - 2, 1),
          end: new Date(targetDate.yyyy, targetDate.mm + 1, 0),
        };
      case "week":
        // Fetch ±5 weeks buffer for quick week navigation
        return {
          start: targetDate.getDateItemBefore(35)._date,
          end: targetDate.getDateItemAfter(41)._date,
        };
      case "month":
        // Fetch current ±1 month for month navigation
        return {
          start: new Date(targetDate.yyyy, targetDate.mm - 2, 1),
          end: new Date(targetDate.yyyy, targetDate.mm + 1, 0),
        };
    }
  };

  const buildCalendarFromEvents = (
    rawEvents: any[],
    startDate: string,
    endDate: string
  ) => {
    const calendar = new Calendar({ startDate, endDate });
    const filtered = filterEventsByVisibility(rawEvents);

    const schoolEvents = filtered.filter((e: any) => e.scope === "school");
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
    return calendar;
  };

  const fetchAndBuildCalendar = async (
    targetDate: DateItem,
    viewMode: Mode
  ) => {
    const range = getQueryRange(targetDate, viewMode);
    const startDate = range.start.toISOString();
    const endDate = range.end.toISOString();

    const { calendarEvents } = await CalendarEventAPI.RCalendarEvents({
      query: {
        startDate,
        endDate,
        ...(currentSchool ? { school: currentSchool._id } : {}),
        ...(props.userId ? { user: props.userId } : {}),
      },
    });

    rawEventsRef.current = calendarEvents;
    cachedRangeRef.current = { start: startDate, end: endDate };

    const calendar = buildCalendarFromEvents(
      calendarEvents,
      startDate,
      endDate
    );
    setCalendar(calendar);
    return calendarEvents;
  };

  const updateCalendar = async (
    targetDate: DateItem,
    viewMode: Mode,
    forceRefetch: boolean = false
  ) => {
    setIsLoading(true);

    const range = getQueryRange(targetDate, viewMode);
    const startDate = range.start.toISOString();
    const endDate = range.end.toISOString();

    // Check if cached data covers the needed range
    const cached = cachedRangeRef.current;
    if (
      !forceRefetch &&
      cached &&
      startDate >= cached.start &&
      endDate <= cached.end &&
      rawEventsRef.current.length > 0
    ) {
      // Use cached data
      const calendar = buildCalendarFromEvents(
        rawEventsRef.current,
        cached.start,
        cached.end
      );
      setCalendar(calendar);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch existing events immediately to show UI fast
      await fetchAndBuildCalendar(targetDate, viewMode);
    } catch (err) {
      ALERT_ERROR(err);
    }

    setIsLoading(false);

    // Background sync: update enrollment/syllabus/memo events without blocking UI
    if (!hasSynced && currentRegistration?.season) {
      setHasSynced(true);
      CalendarEventAPI.SyncCalendarEvents({
        data: {
          season: currentRegistration.season,
          ...(props.userId ? { targetUser: props.userId } : {}),
        },
      })
        .then(async (res) => {
          // Re-fetch only if sync actually changed something
          if (res.synced > 0 || res.removed > 0) {
            try {
              // Use refs to get current view state (not stale closure)
              await fetchAndBuildCalendar(
                currentDateRef.current,
                currentModeRef.current
              );
            } catch {}
          }
        })
        .catch((err: any) => {
          if (err?.response?.data?.message !== "REGISTRATION_NOT_FOUND") {
            ALERT_ERROR(err);
          }
        });
    }
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
            reminder: formData.reminder,
            scheduleStart: formData.scheduleStart,
            notifySchool: formData.notifySchool,
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
            school: currentSchool?._id,
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
            reminder: formData.reminder,
            scheduleStart: formData.scheduleStart,
            notifySchool: formData.notifySchool,
          },
        });
      }

      setIsEventFormPopupActive(false);
      setEditingEventId(undefined);
      setEventFormDefaults(undefined);
      updateCalendar(dateItem, mode, true);
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
      reminder: eventItem.reminder,
      scheduleStart: eventItem.scheduleStart,
      notifySchool: eventItem.notifySchool,
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
      updateCalendar(dateItem, mode, true);
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

    // Check if navigation needs a refetch (outside cached range)
    updateCalendar(_date, navProps.mode).then(() => {
      setIsMounted(false);
      setTimeout(() => {
        setIsMounted(true);
        setDateItem(_date);
      }, 50);
    });
  };

  // Keep refs in sync with state for background sync callback
  useEffect(() => {
    currentDateRef.current = dateItem;
  }, [dateItem]);
  useEffect(() => {
    currentModeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const _mode = window.localStorage.getItem("calendarMode");
    let initialMode: Mode = "week";
    if (_mode && (_mode === "day" || _mode === "week" || _mode === "month")) {
      setMode(_mode);
      initialMode = _mode;
    } else {
      window.localStorage.setItem("calendarMode", "week");
    }

    currentModeRef.current = initialMode;
    updateCalendar(dateItem, initialMode);

    // Load calendar settings from backend
    CalendarSettingAPI.RCalendarSettings()
      .then((settings) => {
        const newSettings = {
          visibleDays: settings.visibleDays,
          referenceTime: settings.referenceTime,
          categoryColors: (settings.categoryColors ?? {}) as Record<string, string>,
        };
        setCalendarSettings(newSettings);
        saveCalendarSettings(newSettings);
      })
      .catch(() => {});

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
                  updateCalendar(dateItem, mode, true);
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
                customCategoryColors={calendarSettings.categoryColors}
                referenceTime={calendarSettings.referenceTime}
                visibleDays={calendarSettings.visibleDays}
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
          customCategoryColors={calendarSettings.categoryColors}
        />
      )}
      {isSettingPopupActive && (
        <SettingPopup
          setPopupActive={setIsSettingPopupActive}
          onVisibilityChange={() => {
            if (rawEventsRef.current.length > 0 && cachedRangeRef.current) {
              const cal = buildCalendarFromEvents(
                rawEventsRef.current,
                cachedRangeRef.current.start,
                cachedRangeRef.current.end
              );
              setCalendar(cal);
            } else {
              updateCalendar(dateItem, mode, true);
            }
          }}
          onSettingsChange={(newSettings) => {
            setCalendarSettings(newSettings);
            saveCalendarSettings(newSettings);
            // Rebuild calendar if colors changed (to re-render with new colors)
            if (rawEventsRef.current.length > 0 && cachedRangeRef.current) {
              const cal = buildCalendarFromEvents(
                rawEventsRef.current,
                cachedRangeRef.current.start,
                cachedRangeRef.current.end
              );
              setCalendar(cal);
            }
          }}
          calendarSettings={calendarSettings}
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
