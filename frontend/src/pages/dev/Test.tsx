import React from "react";
import Input from "../../components/input/Input";

import TimeTable from "../../components/timetable/TimeTable";

type Props = {};

const Test = (props: Props) => {
  return (
    <div style={{ margin: "24px" }}>
      <div></div>
      <TimeTable
        header={{
          days: ["mon", "tue", "wed", "thu", "fri"],
          period: [
            { label: "아침 활동", start: "07:00:00", end: "07:30:00" },
            { label: "아침식사", start: "07:00:00", end: "07:30:00" },
            { label: "1교시", start: "09:00:00", end: "09:35:00" },
            { label: "2교시", start: "09:45:00", end: "10:30:00" },
            { label: "3교시", start: "10:35:00", end: "11:20:00" },
            { label: "4교시", start: "11:25:00", end: "12:10:00" },
            { label: "점심식사", start: "12:10:00", end: "13:10:00" },
            { label: "5교사", start: "13:10:00", end: "13:55:00" },
            { label: "6교시", start: "07:30:00", end: "08:30:00" },
            { label: "7교시", start: "07:30:00", end: "08:30:00" },
            { label: "8교시", start: "07:30:00", end: "08:30:00" },
            { label: "9교시", start: "07:30:00", end: "08:30:00" },
            { label: "10교시", start: "07:30:00", end: "08:30:00" },
            { label: "10교시", start: "07:30:00", end: "08:30:00" },
            { label: "저녁식사", start: "07:30:00", end: "08:30:00" },
            { label: "10교시", start: "21:20:00", end: "21:30:00" },
          ],
        }}
        data={[
          {
            period: {
              day: 2,
              start: "10:35:00",
              end: "11:20:00",
            },
            content: {
              title: "몰리 2",
              subtitle: "과목/수학",
              tags: ["몰라", "건너뛰어"],
            },
          },
          {
            period: {
              day: 3,
              start: "08:50:00",
              end: "07:25:00",
            },
            content: {
              title: "웹프로그래밍",
              subtitle: "과목/수학",
              tags: ["몰라", "건너뛰어"],
            },
          },
        ]}
      />
    </div>
  );
};

export default Test;
