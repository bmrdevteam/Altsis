import React, { useState } from "react";
import Svg from "../../assets/svg/Svg";
import style from "./calendar.module.scss";
import _ from "lodash";

import { GoogleCalendarData } from "./calendarData";
import {
  dateFormat,
  getFirstDateOfMonth,
  getLastDateOfMonth,
  getDateBefore,
  getDateAfter,
} from "functions/functions";

// function dateFormat(date: Date) {
//   return date.toISOString().split("T")[0];
// }
import DailyView from "./view/DailyViewer/Index";
import WeeklyView from "./view/WeeklyViewer/Index";
import TableView from "./view/TableViewer/Index";
import MonthlyView from "./view/MonthlyViwer/Index";
import Select from "components/select/Select";
import Button from "components/button/Button";

type Props = {
  year: number;
  month: number;
  onDateSelect?: (date: any) => void;
  googleCalendars: GoogleCalendarData[];
};

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

type Mode = "day" | "week" | "month" | "year" | "table";

const Calender = (props: Props) => {
  const [mode, setMode] = useState<Mode>("week");
  const today = new Date();

  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const todayString = dateFormat(today); //yyyy-mm-dd

  const curMonthStartDate = getFirstDateOfMonth(year, month);
  const curMonthEndDate = getLastDateOfMonth(year, month);

  const exMonthBeginDate = getDateBefore(
    curMonthStartDate,
    curMonthStartDate.getDay()
  );

  const nextMonthEndDate = getDateAfter(
    curMonthEndDate,
    6 - curMonthEndDate.getDay()
  );

  const createCalender = () => {
    const days: Date[] = [];

    let date = new Date(exMonthBeginDate);
    while (date <= nextMonthEndDate) {
      const newDate = new Date(date);
      days.push(newDate);
      date.setDate(newDate.getDate() + 1);
    }
    return days;
  };

  const handleOnClick = (cmd: "left" | "right") => {
    if (cmd === "left") {
      if (month === 1) {
        setYear((prev) => prev - 1);
        setMonth(12);
      } else {
        setMonth((prev) => prev - 1);
      }
    }
    if (cmd === "right") {
      if (month === 12) {
        setYear((prev) => prev + 1);
        setMonth(1);
      } else {
        setMonth((prev) => prev + 1);
      }
    }
  };

  const Viewer: { [key in Mode]: React.ReactElement } = {
    day: (
      <DailyView
        date={today}
        events={[
          {
            id: "asdfasdf",
            // isAllday: true,
            startTime: new Date("2023-05-18 16:00"),
            startTimeText: "2023-05-18 16:00",
            endTime: new Date("2023-05-18 18:00"),
            endTimeText: "2023-05-18 18:00",
            title: "테스트",
            type: "memo",
            _id: "asdfasdf",
          },
        ]}
        // year={props.year}
        // month={props.month}
        // googleCalendar={props.googleCalendars[0]}
      />
    ),
    week: (
      <WeeklyView
        date={today}
        events={[
          {
            id: "asdfasdf",
            // isAllday: true,
            startTime: new Date("2023-05-18 16:00"),
            startTimeText: "2023-05-18 16:00",
            endTime: new Date("2023-05-18 18:00"),
            endTimeText: "2023-05-18 18:00",
            title: "테스트",
            type: "memo",
            _id: "asdfasdf",
          },
        ]}
        // year={props.year}
        // month={props.month}
        // googleCalendar={props.googleCalendars[0]}
      />
    ),
    month: (
      <MonthlyView
        year={props.year}
        month={props.month}
        googleCalendar={props.googleCalendars[0]}
      />
    ),
    year: <div>Day</div>,
    table: (
      <TableView
        year={props.year}
        month={props.month}
        googleCalendar={props.googleCalendars[0]}
      />
    ),
  };

  return (
    <div className={style.calender_container}>
      <div className={style.calender}>
        <div className={style.top}>
          <div className={style.header}>
            <div className={style.title}>
              {year}년 {month}월
            </div>
            <div className={style.subTitle}></div>
          </div>
          <div className={style.controls}>
            <div className={style.btn}>
              <div
                className={style.subBtn}
                onClick={() => handleOnClick("left")}
              >
                <Svg type={"chevronLeft"} />
              </div>
              <div className={style.subBtn}>오늘</div>
              <div
                className={style.subBtn}
                onClick={() => handleOnClick("right")}
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
        <div className={style.viewer_container}>{Viewer[mode]}</div>
      </div>
    </div>
  );
};

export default Calender;
