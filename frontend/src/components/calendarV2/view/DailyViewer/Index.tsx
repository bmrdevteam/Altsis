import React, { useEffect, useRef, useState } from "react";
import style from "./style.module.scss";
import create from "zustand";
import useGenerateId from "hooks/useGenerateId";
import Svg from "assets/svg/Svg";
import { useAuth } from "contexts/authContext";
import Select from "components/select/Select";
import Input from "components/input/Input";
import Textarea from "components/textarea/Textarea";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import useApi from "hooks/useApi";
import { getLastTimeOfDate, getStartTimeOfDate } from "functions/functions";

type TEvent = {
  id: string;
  title: string;

  startTime: Date;
  startTimeText: string;
  endTime: Date;
  endTimeText: string;

  type?: string;
  classroom?: string;

  memo?: string;
  _id?: string;
};

interface ICalendarState {
  events: TEvent[];
  addEvent: (
    title: string,
    startTime: Date,
    startTimeText: string,
    endTime: Date,
    endTimeText: string
  ) => void;
  setEvents: (events: TEvent[]) => void;
  editor: boolean;
  setEditor: (to: boolean) => void;
  currentEvent: TEvent | undefined;
  setCurrentEvent: (id: string) => void;
}

const useStore = create<ICalendarState>()((set) => {
  const idGen = useGenerateId;
  return {
    events: [],
    editor: false,
    setEditor: (to: boolean) =>
      set((state) => ({
        editor: to,
      })),
    addEvent: (title, startTime, startTimeText, endTime, endTimeText) =>
      set((state) => ({
        events: [
          ...state.events,
          {
            id: idGen(12),
            title: "",
            startTime: startTime,
            startTimeText: startTimeText,
            endTime: endTime,
            endTimeText: endTimeText,
          },
        ],
      })),
    setEvents: (events) =>
      set((state) => ({
        events: events,
      })),
    currentEvent: undefined,
    setCurrentEvent: (id: string) =>
      set((state) => ({
        currentEvent: state.events.filter((val) => val.id === id)[0],
      })),
  };
});

const RowFunction = () => {
  const { addEvent } = useStore();
  return (
    <div className={style.row_function}>
      {Array.from(Array(24).keys()).map((val) => {
        return (
          <div
            key={val}
            className={style.block}
            onClick={() => {
              // addEvent(day, `${val}:00`, `${val + 1}:00`);
            }}
          ></div>
        );
      })}
    </div>
  );
};

const Event = ({ data }: { data: TEvent }) => {
  const { setEditor, setCurrentEvent } = useStore();

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
      onClick={() => {
        setCurrentEvent(data.id);
        setEditor(true);
      }}
    >
      <div className={style.title}>
        {(data.title || data.title === " ") ?? "제목 없음"}
      </div>
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

const mode = "edit";
const defaultEvents: TEvent[] = [];

type days = "일" | "월" | "화" | "수" | "목" | "금" | "토";

type Props = {
  date: Date;
  events: TEvent[];
};

const TimeLabels = () => {
  const labels = [<div className={style.label}></div>];
  for (let i = 1; i <= 12; i++)
    labels.push(<div className={style.label}>{i}:00 AM</div>);
  for (let i = 1; i < 12; i++)
    labels.push(<div className={style.label}>{i}:00 PM</div>);
  return <div className={style.time_labels}>{labels}</div>;
};

function Schedule(props: Props) {
  const [date] = useState<Date>(props.date);
  const { setEvents } = useStore();
  const today = new Date();

  useEffect(() => {
    props.events && setEvents(props.events);
  }, [props.events]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const EventContainer = () => {
    const { events } = useStore();
    const filteredEvents = events.filter(
      (val) =>
        val.endTime > getStartTimeOfDate(date) &&
        val.startTime < getLastTimeOfDate(date)
    );

    console.log(filteredEvents);
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
      <div className={style.calendar}>
        {TimeLabels()}
        <CurrentTime />
        <div className={style.grid} ref={scrollRef}>
          <div key={"dsf"} className={style.column}>
            <RowGrid />
            <EventContainer />
            <RowFunction />
          </div>
        </div>
        {/* <EventEditor mode={mode} /> */}
      </div>
    </div>
  );
}

export default Schedule;
