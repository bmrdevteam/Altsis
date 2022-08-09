import React from "react";
import style from "./timetable.module.scss";
type Props = {
  header: {
    days: Array<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun">;
    period: { label: string; start: string; end: string }[];
  };
  data: {
    period: {
      day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      start: string;
      end: string;
    };
    content: {
      title: string;
      subtitle: string;
      tags: string[];
    };
  }[];
};

const TimeTable = (props: Props) => {
  const currentTime = new Date();

  function parseTime(str: string) {
    const d = new Date();
    const arr = str.split(":");

    d.setHours(parseInt(arr[0]));
    d.setMinutes(parseInt(arr[1]));
    d.setSeconds(parseInt(arr[2]));
    return d;
  }

  function getDifference() {
    const timetableStart = parseTime(props.header.period[0].start);
    const timetableEnd = parseTime(
      props.header.period[props.header.period.length - 1].end
    );
    const hours = Math.abs(timetableStart.getHours() - timetableEnd.getHours());
    const minutes = Math.abs(
      timetableStart.getMinutes() - timetableEnd.getMinutes()
    );

    return hours * 60 + minutes;
  }

  function calcRow(start: Date, end: Date) {
    const startDate =
      Math.abs(
        parseTime(props.header.period[0].start).getHours() * 60 +
          parseTime(props.header.period[0].start).getMinutes() -
          (start.getHours() * 60 + start.getMinutes())
      ) + 1;
    const endDate =
      Math.abs(
        parseTime(props.header.period[0].start).getHours() * 60 +
          parseTime(props.header.period[0].start).getMinutes() -
          (end.getHours() * 60 + end.getMinutes())
      ) + 1;
    return [startDate, endDate].sort((a, b) => a - b);
  }

  const RowHeader = () => {
    return (
      <div className={style.row_header}>
        <div></div>
        {props.header.days.map((value, index) => {
          return (
            <div key={index} className={style.item}>
              {value}
            </div>
          );
        })}
      </div>
    );
  };
  const ColumnHeader = () => {
    return <div></div>;
  };
  const Body = () => {
    return (
      <div
        className={style.body}
        style={{
          gridTemplateColumns: `repeat(${props.header.days.length},1fr)`,
          gridTemplateRows: `repeat(${getDifference()},1fr)`,
        }}
      >
        {props.data?.map((value, index) => {
          const row = calcRow(
            parseTime(value.period.start),
            parseTime(value.period.end)
          );
          return (
            <div
              key={index}
              className={style.timetable_block}
              style={{
                gridColumn: value.period.day !== 0 ? value.period.day : 7,
                gridRow: `${row[0]} / ${row[1]}`,
              }}
            >
              <span className={style.title}>{value.content.title}</span>
                <span  className={style.subtitle}>{value.content.subtitle} </span>
            </div>
          );
        })}
      </div>
    );
  };
  return (
    <div className={style.timetable}>
      <RowHeader />
      <Body />
    </div>
  );
};
export default TimeTable;
