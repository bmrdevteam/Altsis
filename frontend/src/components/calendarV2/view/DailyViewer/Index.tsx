import React, { useEffect, useRef, useState } from "react";
import style from "./style.module.scss";
import create from "zustand";

import { DateItem, calendarItem } from "components/calendarV2/calendarData";

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

const Event = ({ data, isMounted }: { data: TEvent; isMounted: boolean }) => {
  const startTime = data.startTimeText.split(" ")[1];
  const endTime = data.endTimeText.split(" ")[1];

  const start =
    parseInt(startTime.split(":")[0]) + parseInt(startTime.split(":")[1]) / 60;
  const end =
    parseInt(endTime.split(":")[0]) + parseInt(endTime.split(":")[1]) / 60;
  const height = end - start;

  return (
    <div
      className={
        style.event + " " + (isMounted ? style.isMounted : style.isUnmounted)
      }
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
  isMounted: boolean;
};

const TimeLabels = () => {
  const labels = [<div className={style.label}></div>];
  for (let i = 1; i <= 12; i++)
    labels.push(<div className={style.label}>{i}:00 AM</div>);
  for (let i = 1; i < 12; i++)
    labels.push(<div className={style.label}>{i}:00 PM</div>);
  return <div className={style.time_labels}>{labels}</div>;
};

function DailyView(props: Props) {
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

  const EventContainer = () => {
    const { events } = useStore();
    return (
      <div className={style.event_container}>
        {events.map((val) => {
          return <Event key={val.id} data={val} isMounted={props.isMounted} />;
        })}
      </div>
    );
  };

  return (
    <div className={style.viewer}>
      <div className={style.calendar}>
        {TimeLabels()}
        <CurrentTime />
        <div className={style.grid} ref={scrollRef}>
          <div className={style.column}>
            <RowGrid />
            <EventContainer />
            <RowFunction />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DailyView;
