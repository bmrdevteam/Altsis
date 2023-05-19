import React, { useState } from "react";
import Svg from "../../../../assets/svg/Svg";
import style from "./calendar.module.scss";
import _ from "lodash";
import Table from "components/tableV2/Table";

import { CalendarData, GoogleCalendarData } from "../../calendarData";
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

type Props = {
  year: number;
  month: number;
  onDateSelect?: (date: any) => void;
  googleCalendar?: GoogleCalendarData;
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

const TableView = (props: Props) => {
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

  let calendarData: CalendarData | undefined = undefined;

  if (props.googleCalendar) {
    calendarData = new CalendarData({
      year: props.year,
      month: props.month,
      googleCalendar: props.googleCalendar,
    });
  }

  return (
    <div>
      <Table
        type="object-array"
        data={calendarData?.items ?? []}
        header={[
          {
            text: "title",
            key: "summary",
            type: "text",
            textAlign: "center",
            wordBreak: "keep-all",
            width: "160px",
          },
          {
            text: "시작",
            key: "startTimeText",
            type: "text",
            textAlign: "center",
            wordBreak: "keep-all",
            width: "120px",
          },
          {
            text: "종료",
            key: "endTimeText",
            type: "text",
            textAlign: "center",
            wordBreak: "keep-all",
            width: "120px",
          },
          {
            text: "종일",
            key: "isAllday",
            type: "status",
            textAlign: "center",
            wordBreak: "keep-all",
            width: "120px",
            status: {
              true: {
                text: "true",
                color: "#B33F00",
              },
              false: {
                text: "false",
                color: "#8657ff",
              },
            },
          },
          {
            text: "htmlLink",
            key: "htmlLink",
            type: "button",
            textAlign: "center",
            wordBreak: "keep-all",
            width: "120px",
            onClick: (e) => {
              console.log(e.htmlLink);
            },
          },
        ]}
      />
    </div>
  );
};

export default TableView;
