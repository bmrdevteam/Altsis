import React, { useEffect, useState } from "react";
import Svg from "../../assets/svg/Svg";
import style from "./calendar.module.scss";
import _ from "lodash";

import Select from "components/select/Select";
import useGoogleAPI from "hooks/useGoogleAPI";
import { useAuth } from "contexts/authContext";

import { CalendarData, DateItem, getEventMap } from "./calendarData";

import WeeklyView from "./view/WeeklyViewer/Index";
import MonthlyView from "./view/MonthlyViwer/Index";
import Loading from "components/loading/Loading";

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

type Mode = "day" | "week" | "month";

const Calender = (props: Props) => {
  const { currentWorkspace } = useAuth();
  const { isLoadingToken, CalendarAPI } = useGoogleAPI();
  const [mode, setMode] = useState<Mode>("week");

  const [calendars, setCalendars] = useState<CalendarData[]>([]);

  const today = new DateItem({ date: new Date() });

  const [dateItem, setDateItem] = useState<DateItem>(today);
  const [subDateItem, setSubDateItem] = useState<DateItem>(today);

  const [isMounted, setIsMounted] = useState(true);

  const [isUpdatingItems, setIsUpdatingItems] = useState<boolean>(false);
  const updateItems = async (year: number) => {
    setIsUpdatingItems(true);
    const calendars = [];
    if (currentWorkspace.calendars?.items) {
      for (let _gCalendar of currentWorkspace.calendars.items) {
        if (!_gCalendar.isChecked) continue;

        const googleCalendar = await CalendarAPI.REvents({
          calendarId: _gCalendar.id,
          queries: {
            timeMin: new Date(year, 0, 1).toISOString(), // YYYY-01-01
            timeMax: new Date(year, 11, 31).toISOString(), // YYYY-12-31
          },
        });
        const calendar = new CalendarData({
          googleCalendar,
        });
        calendars.push(calendar);
      }
    }
    setCalendars(calendars);
    setIsUpdatingItems(false);
  };

  const handleOnClick = (props: {
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
      updateItems(_date.yyyy).then((res) => {
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
    day: `${dateItem.formatText(4)}`,
    week: `${dateItem.formatText(3)} ~ ${subDateItem.formatText(3)}`,
    month: `${dateItem.formatText(2)}`,
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

    return getEventMap(calendars, startDateItem, endDateItem);
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

    return getEventMap(calendars, startDateItem, endDateItem);
  };

  const Viewer: { [key in Mode]: React.ReactElement } = {
    day: (
      <WeeklyView
        eventMap={getEventMap(calendars, dateItem, dateItem)}
        isMounted={isMounted}
        dayList={[dateItem.getDayString()]}
      />
    ),
    week: (
      <WeeklyView
        eventMap={getEventMap(calendars, dateItem, subDateItem)}
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
  };

  useEffect(() => {
    if (!isLoadingToken) {
      updateItems(dateItem.yyyy);
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
        <div className={style.viewer_container}>
          {dateItem &&
            (!isUpdatingItems ? (
              Viewer[mode]
            ) : (
              <Loading height={"calc(100vh - 200px)"} />
            ))}
        </div>
      </div>
    </div>
  );
};

export default Calender;
