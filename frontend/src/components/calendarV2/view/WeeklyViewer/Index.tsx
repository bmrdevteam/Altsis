import React, { useEffect, useRef, useState } from "react";
import style from "./style.module.scss";
import create from "zustand";

import { calendarItem } from "components/calendarV2/calendarData";

type TEvent = calendarItem & {
  type?: string;
  classroom?: string;
  memo?: string;
  _id?: string;
};

interface ICalendarState {
  events: TEvent[];
  setEvents: (events: TEvent[]) => void;
}

const useStore = create<ICalendarState>()((set) => {
  return {
    events: [],
    editor: false,
    setEvents: (events) =>
      set((state) => ({
        events: events,
      })),
  };
});

const RowFunction = () => {
  return (
    <div className={style.row_function}>
      {Array.from(Array(24).keys()).map((val) => {
        return <div key={val} className={style.block}></div>;
      })}
    </div>
  );
};

const Event = ({ data }: { data: TEvent }) => {
  const startTime = data.startTimeText.split(" ")[1];
  const endTime = data.endTimeText.split(" ")[1];

  const start =
    parseInt(startTime.split(":")[0]) + parseInt(startTime.split(":")[1]) / 60;
  const end =
    parseInt(endTime.split(":")[0]) + parseInt(endTime.split(":")[1]) / 60;
  const height = end - start;

  return (
    <div
      className={style.event}
      style={{
        top: `${start * 80}px`,
        height: `${height * 80}px`,
      }}
    >
      <div className={style.title}>{data.summary ?? "제목 없음"}</div>
      {data.classroom && <div className={style.room}>{data.classroom}</div>}
      <div className={style.time}>
        {startTime}
        {" ~ "}
        {endTime}
      </div>
    </div>
  );
};

const CurrentTime = () => {
  const [, update] = useState({});
  const currentTimeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    currentTimeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    const timer = setInterval(() => {
      update({});
    }, 10000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const today = new Date();
  const currentTime = today.getHours() + today.getMinutes() / 60;

  return (
    <div
      ref={currentTimeRef}
      className={style.current_time}
      style={{ top: `${currentTime * 80}px` }}
    >
      <div className={style.time}>{``}</div>
      <div className={style.indicator}></div>
    </div>
  );
};

const RowGrid = () => {
  return (
    <div className={style.row_grid}>
      {Array.from(Array(24).keys()).map((val) => {
        return <div key={val} className={style.block}></div>;
      })}
    </div>
  );
};

type Props = {
  eventMap?: Map<string, calendarItem[]>;
};

const TimeLabels = () => {
  const labels = [<div className={style.label}></div>];
  for (let i = 1; i <= 12; i++)
    labels.push(<div className={style.label}>{i}:00 AM</div>);
  for (let i = 1; i < 12; i++)
    labels.push(<div className={style.label}>{i}:00 PM</div>);
  return <div className={style.time_labels}>{labels}</div>;
};

function WeeklyView(props: Props) {
  const { setEvents } = useStore();

  useEffect(() => {
    if (props.eventMap) {
      const events = [];
      for (let dateText of Array.from(props.eventMap.keys())) {
        events.push(...props.eventMap.get(dateText)!);
      }
      setEvents(events);
    }
  }, [props.eventMap]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const EventContainer = (props2: { dateText: string }) => {
    const { events } = useStore();
    const filteredEvents = [];
    for (let val of events) {
      if (
        val.endTimeText <= props2.dateText + " 23:59:59" &&
        val.startTimeText >= props2.dateText
      ) {
        filteredEvents.push(val);
      }
    }

    return (
      <div className={style.event_container}>
        {filteredEvents.map((val) => {
          return <Event key={val.id} data={val} />;
        })}
      </div>
    );
  };

  return (
    <div className={style.viewer}>
      <div className={style.header}>
        <div className={style.days}>
          <div style={{ minWidth: "80px", maxWidth: "80px" }}></div>
          {["일", "월", "화", "수", "목", "금", "토"].map((day) => {
            return (
              <div key={day} className={style.day}>
                {day}
              </div>
            );
          })}
        </div>
      </div>

      <div className={style.calendar}>
        {TimeLabels()}
        <CurrentTime />
        <div className={style.grid} ref={scrollRef}>
          {Array.from(props.eventMap?.keys() ?? []).map((dateText, idx) => {
            return (
              <div key={`col-${idx}`} className={style.column}>
                <RowGrid />
                <EventContainer dateText={dateText} />
                <RowFunction />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default WeeklyView;
