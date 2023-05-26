import React, { useEffect, useState } from "react";
import Svg from "../../assets/svg/Svg";
import style from "./calendar.module.scss";
import _ from "lodash";

import Select from "components/select/Select";
import useGoogleAPI from "hooks/useGoogleAPI";
import { useAuth } from "contexts/authContext";

import { CalendarData, DateItem, GoogleCalendarData } from "./calendarData";

import WeeklyView from "./view/WeeklyViewer/Index";
import TableView from "./view/TableViewer/Index";
import MonthlyView from "./view/MonthlyViwer/Index";

/**
 * calendar component
 *
 * @param props
 *
 * @returns carlendar component
 *
 * @example <Calendar/>
 *
 * @version 2.0 second version
 */

type Props = {};

type Mode = "day" | "week" | "month" | "table";

const Calender = (props: Props) => {
  const { currentWorkspace } = useAuth();
  const { isLoadingToken, CalendarAPI } = useGoogleAPI();
  const [mode, setMode] = useState<Mode>("week");

  const [googleCalendar, setGoogleCalendar] = useState<GoogleCalendarData>();
  const [calendar, setCalendar] = useState<CalendarData>();

  const today = new DateItem({ date: new Date() });

  const [dateItem, setDateItem] = useState<DateItem>(today);
  const [subDateItem, setSubDateItem] = useState<DateItem>(today);

  const [isMounted, setIsMounted] = useState(true);

  const updateCalendar = async (year: number) => {
    const googleCalendar = await CalendarAPI.REvents({
      calendarId: currentWorkspace.calendars?.items[4].id,
      queries: {
        timeMin: new Date(year, 0, 1).toISOString(), // YYYY-01-01
        timeMax: new Date(year, 11, 31).toISOString(), // YYYY-12-31
      },
    });
    setGoogleCalendar(googleCalendar);

    const calendar = new CalendarData({
      googleCalendar,
    });
    setCalendar(calendar);

    // calendar?.getItemsByDays({ startDate: date, days: 7 });
  };

  const handleOnClick = (props: {
    cmd: "left" | "right" | "center";
    mode: Mode;
  }) => {
    if (!dateItem) return;
    setIsMounted(false);

    let _date: DateItem = dateItem;

    if (props.mode === "month" || props.mode === "table") {
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

  const Label: { [key in Mode]: string } = {
    day: `${dateItem?.yyyy}년 ${dateItem?.mm}월 ${
      dateItem?.dd
    }일 ${dateItem?.getDayString()}요일`,
    week: `${dateItem?.yyyy}년 ${dateItem?.mm}월 ${dateItem?.dd}일 ~ ${subDateItem?.yyyy}년 ${subDateItem?.mm}월 ${subDateItem?.dd}일`,
    month: `${dateItem?.yyyy}년 ${dateItem?.mm}월`,
    table: `${dateItem?.yyyy}년 ${dateItem?.mm}월`,
  };

  const getFullMonthlyEventMap = () => {
    const startDateItem = dateItem.getDateItemBefore(dateItem.getDay());

    const _endDateItem = new DateItem({
      fields: {
        yyyy: dateItem.yyyy,
        mm: dateItem.mm + 1,
        dd: 0,
      },
    });
    const endDateItem = _endDateItem.getDateItemAfter(
      6 - _endDateItem.getDay()
    );

    return calendar?.getEventMap(startDateItem, endDateItem);
  };

  const getMonthlyEventMap = () => {
    const startDateItem = dateItem;
    const endDateItem = new DateItem({
      fields: {
        yyyy: dateItem.yyyy,
        mm: dateItem.mm + 1,
        dd: 0,
      },
    });
    return calendar?.getEventMap(startDateItem, endDateItem);
  };

  const Viewer: { [key in Mode]: React.ReactElement } = {
    day: (
      <WeeklyView
        eventMap={calendar?.getEventMap(dateItem, dateItem)}
        isMounted={isMounted}
        dayList={[dateItem.getDayString()]}
      />
    ),
    week: (
      <WeeklyView
        eventMap={calendar?.getEventMap(dateItem, subDateItem)}
        isMounted={isMounted}
        dayList={["일", "월", "화", "수", "목", "금", "토"]}
      />
    ),
    month: (
      <MonthlyView
        year={dateItem.yyyy}
        month={dateItem.mm}
        eventMap={getFullMonthlyEventMap()}
      />
    ),
    table: <TableView eventMap={getMonthlyEventMap()} />,
  };

  useEffect(() => {
    if (!isLoadingToken) {
      updateCalendar(dateItem.yyyy);
    }
    return () => {};
  }, [isLoadingToken]);

  useEffect(() => {
    if (dateItem && mode === "week") {
      setSubDateItem(dateItem.getDateItemAfter(6));
    }

    return () => {};
  }, [dateItem]);

  useEffect(() => {
    if (mode === "day") {
      if (dateItem.mm === today.mm) {
        setDateItem(today);
      }
    } else if (mode === "week") {
      const _dateItem = today.getDateItemBefore(today.getDay());
      setDateItem(_dateItem);
    } else if (mode === "month" || mode === "table") {
      const _dateItem = new DateItem({
        fields: { yyyy: today.yyyy, mm: today.mm, dd: 1 },
      });
      setDateItem(_dateItem);
    }

    return () => {};
  }, [mode]);

  return (
    <div
      className={style.calender_container}
      style={{ maxWidth: mode === "month" ? "640px" : "100%" }}
    >
      <div className={style.calender}>
        <div className={style.top}>
          <div className={style.header}>
            <div className={style.title}>{Label[mode]}</div>
            <div className={style.subTitle}></div>
          </div>
          <div className={style.controls}>
            <div className={style.btn}>
              <div
                className={style.subBtn}
                onClick={() => handleOnClick({ cmd: "left", mode })}
              >
                <Svg type={"chevronLeft"} />
              </div>
              <div
                className={style.subBtn}
                onClick={() => handleOnClick({ cmd: "center", mode })}
              >
                오늘
              </div>
              <div
                className={style.subBtn}
                onClick={() => handleOnClick({ cmd: "right", mode })}
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
                  { text: "일정", value: "table" },
                ]}
                onChange={(val: Mode) => {
                  setMode(val);
                }}
                defaultSelectedValue={mode}
              />
            </div>
            <div className={style.btn}>
              <div className={style.subBtn}>일정 추가</div>
            </div>
          </div>
        </div>
        <div className={style.viewer_container}>{dateItem && Viewer[mode]}</div>
      </div>
    </div>
  );
};

export default Calender;
