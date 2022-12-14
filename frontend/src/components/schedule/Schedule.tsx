import React, { useEffect, useRef, useState } from "react";
import style from "./schedule.module.scss";
import create from "zustand";
import useGenerateId from "hooks/useGenerateId";
import Svg from "assets/svg/Svg";

type TEvent = {
  id: string;
  day: string;
  title: string;
  startTime: string;
  endTime: string;
};

interface ICalendarState {
  events: TEvent[];
  addEvent: (day: string, startTime: string, endTime: string) => void;
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
    addEvent: (day, startTime, endTime) =>
      set((state) => ({
        events: [
          ...state.events,
          {
            id: idGen(12),
            day: day,
            title: "",
            startTime: startTime,
            endTime: endTime,
          },
        ],
      })),
    setEvents: (events) =>
      set((state) => ({
        events:  events,
      })),
    currentEvent: undefined,
    setCurrentEvent: (id: string) =>
      set((state) => ({
        currentEvent: state.events.filter((val) => val.id === id)[0],
      })),
  };
});
const RowFunction = ({ day }: { day: string }) => {
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
const EventEditor = () => {
  const { editor, setEditor, currentEvent } = useStore();
  return editor ? (
    <>
      <div
        className={style.editor_background}
        onClick={() => {
          setEditor(false);
        }}
      ></div>
      <div className={style.editor_container}>
        <div className={style.title}>일정 수정</div>
        <input
          className={style.title_input}
          type="text"
          defaultValue={currentEvent?.title}
          placeholder="제목 입력"
        />
        <div>{currentEvent?.startTime}</div>
        <input type="time" />
      </div>
    </>
  ) : (
    <></>
  );
};
const Event = ({ data }: { data: TEvent }) => {
  const { setEditor, setCurrentEvent } = useStore();
  const start =
    parseInt(data.startTime.split(":")[0]) +
    parseInt(data.startTime.split(":")[1]) / 60;
  const end =
    parseInt(data.endTime.split(":")[0]) +
    parseInt(data.endTime.split(":")[1]) / 60;
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
      <div className={style.time}>
        {data.startTime}
        {" ~ "}
        {data.endTime}
      </div>
    </div>
  );
};

const EventContainer = ({ day }: { day: string }) => {
  const { events } = useStore();
  const filteredEvents = events.filter((val) => val.day === day);
  return (
    <div className={style.event_container}>
      {filteredEvents.map((val) => {
        return <Event key={val.id} data={val} />;
      })}
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
const RowGrid = ({ day }: { day: string }) => {
  return (
    <div className={style.row_grid}>
      {Array.from(Array(24).keys()).map((val) => {
        return <div key={val} className={style.block}></div>;
      })}
    </div>
  );
};
function Schedule({ defaultEvents }: { defaultEvents?: TEvent[] }) {
  const { setEvents } = useStore();
  const today = new Date()

  useEffect(() => {
    defaultEvents && setEvents(defaultEvents);
  }, [defaultEvents]);
  

  const scrollRef = useRef<HTMLDivElement>(null);

  const dayArray = ["일", "월", "화", "수", "목", "금", "토"];
  return (
    <div className={style.calendar_container}>
      <div className={style.header}>
        <div className={style.controls}>
          <div className={style.title}>일정</div>
          <div style={{ flex: "1 1 0" }}></div>
          <div className={style.btn}>일정추가</div>
          <div>
            <Svg type={"chevronLeft"} width={"24px"} height={"24px"} />
          </div>
          <div>{}</div>
          <div>
            <Svg type={"chevronRight"} width={"24px"} height={"24px"} />
          </div>
          <div>
            <Svg type={"horizontalDots"} width={"24px"} height={"18px"} />
          </div>
        </div>
        <div className={style.days}>
          <div style={{ minWidth: "80px", maxWidth: "80px" }}></div>
          {dayArray.map((val) => {
            return (
              <div key={val} className={style.day}>
                {val}
              </div>
            );
          })}
        </div>
      </div>
      <div className={style.calendar}>
        <div className={style.time_labels}>
          <div className={style.label}>0:00 AM</div>
          <div className={style.label}>1:00 AM</div>
          <div className={style.label}>2:00 AM</div>
          <div className={style.label}>3:00 AM</div>
          <div className={style.label}>4:00 AM</div>
          <div className={style.label}>5:00 AM</div>
          <div className={style.label}>6:00 AM</div>
          <div className={style.label}>7:00 AM</div>
          <div className={style.label}>8:00 AM</div>
          <div className={style.label}>9:00 AM</div>
          <div className={style.label}>10:00 AM</div>
          <div className={style.label}>11:00 AM</div>
          <div className={style.label}>12:00 PM</div>
          <div className={style.label}>1:00 PM</div>
          <div className={style.label}>2:00 PM</div>
          <div className={style.label}>3:00 PM</div>
          <div className={style.label}>4:00 PM</div>
          <div className={style.label}>5:00 PM</div>
          <div className={style.label}>6:00 PM</div>
          <div className={style.label}>7:00 PM</div>
          <div className={style.label}>8:00 PM</div>
          <div className={style.label}>9:00 PM</div>
          <div className={style.label}>10:00 PM</div>
          <div className={style.label}>11:00 PM</div>
        </div>
        <CurrentTime />
        <div className={style.grid} ref={scrollRef}>
          {dayArray.map((val) => {
            return (
              <div key={val} className={style.column}>
                <RowGrid day={val} />
                <EventContainer day={val} />
                <RowFunction day={val} />
              </div>
            );
          })}
        </div>
        <EventEditor />
      </div>
    </div>
  );
}

export default Schedule;
