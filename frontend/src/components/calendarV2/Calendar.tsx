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
import MonthlyView from "./view/MonthlyViwer/Index";
import Loading from "components/loading/Loading";
import EventPopup from "./view/EventPopup/Index";
import SettingPopup from "./view/SettingPopup/Index";
import EventFormPopup, {
  EventFormData,
} from "./view/EventFormPopup/Index";

/**
 * calendar component
 *
 * @param props
 *
 * @returns carlendar component
 *
 * @example <Calendar/>
 *
 * @version 3.0 self-hosted calendar
 */

type Props = {};

type Mode = "day" | "week" | "month";

const getLabel = ({ dateItem, mode }: { dateItem: DateItem; mode: Mode }) => {
  switch (mode) {
    case "day":
      return `${dateItem.formatText(4)}`;
    case "week":
      return `${dateItem.formatText(3)} ~ ${dateItem
        .getDateItemAfter(6)
        .formatText(3)}`;
    case "month":
      return `${dateItem.formatText(2)}`;
  }
  return "";
};

const Viewer = memo(
  ({
    mode,
    calendar,
    dateItem,
    isMounted,
    setEvent,
    setIsEventPopupActive,
  }: {
    mode: Mode;
    calendar: Calendar;
    dateItem: DateItem;
    isMounted: boolean;
    setEvent: React.Dispatch<React.SetStateAction<EventItem | undefined>>;
    setIsEventPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  }) => {
    const onClickEventHandler = (event: EventItem) => {
      setEvent(event);
      setIsEventPopupActive(true);
    };

    if (mode === "day") {
      return (
        <WeeklyView
          eventMap={calendar?.getEventMap(dateItem, dateItem)}
          isMounted={isMounted}
          dayList={[dateItem.getDayString()]}
          onClickEvent={onClickEventHandler}
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
        />
      );
    }
    return <></>;
  }
);

const Calender = (props: Props) => {
  const { currentRegistration, currentSchool, currentUser } = useAuth();
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

  const updateCalendar = async (year: number) => {
    setIsLoading(true);

    // sync enrollment/syllabus events on first load
    if (!hasSynced && currentRegistration?.season) {
      try {
        await CalendarEventAPI.SyncCalendarEvents({
          data: { season: currentRegistration.season },
        });
        setHasSynced(true);
      } catch (err) {
        ALERT_ERROR(err);
      }
    }

    const calendar = new Calendar({ year });
    const startDate = new Date(year, 0, 1).toISOString();
    const endDate = new Date(year, 11, 31).toISOString();

    // get all calendar events from API (includes synced enrollment events)
    try {
      const { calendarEvents } = await CalendarEventAPI.RCalendarEvents({
        query: { startDate, endDate },
      });

      const schoolEvents = calendarEvents.filter(
        (e: any) => e.scope === "school"
      );
      const personalEvents = calendarEvents.filter(
        (e: any) => e.scope === "personal"
      );

      if (schoolEvents.length > 0) {
        calendar.addCustomEvents(schoolEvents, "schoolCalendar");
      }
      if (personalEvents.length > 0) {
        calendar.addCustomEvents(personalEvents, "personalCalendar");
      }
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
          },
          color: formData.color,
        },
      });

      setIsEventFormPopupActive(false);
      updateCalendar(dateItem.yyyy);
    } catch (err) {
      ALERT_ERROR(err);
    }
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

  const onClickNavHandler = (props: {
    cmd: "left" | "right" | "center";
    mode: Mode;
  }) => {
    if (!dateItem) return;
    setIsMounted(false);

    let _date: DateItem = dateItem;

    if (props.mode === "month") {
      if (props.cmd === "center") {
        _date = new DateItem({
          fields: {
            yyyy: today.yyyy,
            mm: today.mm,
            dd: 1,
          },
        });
      } else if (props.cmd === "left") {
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
    } else if (props.mode === "week") {
      if (props.cmd === "center") {
        _date = new DateItem({
          fields: {
            yyyy: today.yyyy,
            mm: today.mm,
            dd: today.dd - today.getDay(),
          },
        });
      } else if (props.cmd === "left") {
        _date = dateItem.getDateItemBefore(7);
      } else {
        _date = dateItem.getDateItemAfter(7);
      }
    } else if (props.mode === "day") {
      if (props.cmd === "center") {
        _date = today;
      } else if (props.cmd === "left") {
        _date = dateItem.getDateItemBefore(1);
      } else {
        _date = dateItem.getDateItemAfter(1);
      }
    }

    if (_date.yyyy !== dateItem.yyyy) {
      updateCalendar(_date.yyyy).then((res) => {
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

  return (
    <>
      <div
        className={style.calender_container}
        style={{ maxWidth: mode === "month" ? "640px" : "100%" }}
      >
        <div className={style.calender}>
          <div className={style.top}>
            <div className={style.header}>
              <div className={style.title}>{getLabel({ dateItem, mode })}</div>
              <div className={style.subTitle}></div>
            </div>
            <div className={style.controls}>
              <div
                className={style.svgBtn}
                onClick={() => setIsEventFormPopupActive(true)}
                title="일정추가"
              >
                <Svg type="plus" width="20px" height="20px" />
              </div>
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
          onDelete={handleEventDelete}
          onEdit={() => {
            setIsEventPopupActive(false);
            // TODO: open edit form with event data
          }}
        />
      )}
      {isSettingPopupActive && (
        <SettingPopup setPopupActive={setIsSettingPopupActive} />
      )}
      {isEventFormPopupActive && (
        <EventFormPopup
          setPopupActive={setIsEventFormPopupActive}
          onSave={handleEventFormSave}
          mode="create"
        />
      )}
    </>
  );
};

export default Calender;
