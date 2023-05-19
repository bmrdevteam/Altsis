import React, { useEffect, useRef, useState } from "react";
import Svg from "assets/svg/Svg";
import style from "./style.module.scss";
import _ from "lodash";

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

import Select from "components/select/Select";
import { GoogleCalendarData } from "components/calendarV2/calendarData";

type Props = {
  year: number;
  month: number;
  onDateSelect?: (date: any) => void;
  googleCalendar: GoogleCalendarData;
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

const MonthlyView = (props: Props) => {
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

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef?.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "end",
    });

    return () => {};
  }, []);

  return (
    <div className={style.viewer} ref={scrollRef}>
      <div className={style.days}>
        <div className={style.day}>일</div>
        <div className={style.day}>월</div>
        <div className={style.day}>화</div>
        <div className={style.day}>수</div>
        <div className={style.day}>목</div>
        <div className={style.day}>금</div>
        <div className={style.day}>토</div>
      </div>
      <div className={style.cells}>
        {createCalender().map((date: Date, index: number) => {
          const dateStr = `${year}-${month.toString().padStart(2, "0")}-${date
            .toString()
            .padStart(2, "0")}`;

          return date.getMonth() + 1 === month &&
            date.getFullYear() === year ? (
            <div
              className={`${style.cell} ${style.current} ${
                todayString === dateStr && style.today
              }`}
              key={index}
              data-value={dateStr}
              onClick={() => {
                console.log(date.toString());
                props.onDateSelect && props.onDateSelect(dateStr);
              }}
            >
              <div className={`${style.date}`}>{date.getDate()}</div>
            </div>
          ) : (
            <div
              className={`${style.cell} ${
                todayString === dateStr && style.today
              }`}
              key={index}
              data-value={dateStr}
              onClick={() => {
                props.onDateSelect && props.onDateSelect(dateStr);
              }}
              style={{ color: "gray" }}
            >
              <div className={`${style.date}`}>{date.getDate()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyView;
