import React, { useEffect, useRef, useState } from "react";
import style from "./style.module.scss";
import {create} from "zustand";

import { EventItem } from "components/calendarV2/calendarData";
import { generateRandomId } from "functions/functions";
interface ICalendarState {
  events: EventItem[];
  setEvents: (events: EventItem[]) => void;
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
    <div key={generateRandomId(12)} className={style.row_function}>
      {Array.from(Array(24).keys()).map((val) => {
        return <div key={generateRandomId(12)} className={style.block}></div>;
      })}
    </div>
  );
};

const Event = ({
  data,
  isMounted,
  onClickEvent,
}: {
  data: EventItem;
  isMounted: boolean;
  onClickEvent: any;
}) => {
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
        style.event +
        " " +
        style[data.from] +
        " " +
        (isMounted ? style.isMounted : style.isUnmounted)
      }
      style={{
        top: `${start * 80}px`,
        height: `${height * 80}px`,
      }}
      onClick={() => onClickEvent(data)}
    >
      <div className={style.title} key={generateRandomId(12)}>
        {data.title ?? "제목 없음"}
      </div>
      {data.location && (
        <div className={style.room} key={generateRandomId(12)}>
          {data.location}
        </div>
      )}
      {data.description && (
        <div className={style.room} key={generateRandomId(12)}>
          {data.description}
        </div>
      )}
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
      <div className={style.time} key={generateRandomId(12)}>{``}</div>
      <div className={style.indicator} key={generateRandomId(12)}></div>
    </div>
  );
};

const RowGrid = () => {
  return (
    <div className={style.row_grid} key={generateRandomId(12)}>
      {Array.from(Array(24).keys()).map((val) => {
        return <div key={generateRandomId(12)} className={style.block}></div>;
      })}
    </div>
  );
};

type Props = {
  eventMap?: Map<string, EventItem[]>;
  isMounted: boolean;
  dayList: string[];
  onClickEvent: any;
};

const TimeLabels = () => {
  const labels = [
    <div className={style.label} key={generateRandomId(12)}></div>,
  ];
  for (let i = 1; i <= 12; i++)
    labels.push(
      <div className={style.label} key={generateRandomId(12)}>
        {i}:00 AM
      </div>
    );
  for (let i = 1; i < 12; i++)
    labels.push(
      <div className={style.label} key={generateRandomId(12)}>
        {i}:00 PM
      </div>
    );
  return (
    <div className={style.time_labels} key={generateRandomId(12)}>
      {labels}
    </div>
  );
};

function WeeklyView(props: Props) {
  const { setEvents } = useStore();
  const [eventMapKeys, setEventMapKeys] = useState<string[]>();

  useEffect(() => {
    if (props.eventMap) {
      const events = [];
      const eventMapKeys = Array.from(props.eventMap.keys());
      for (let dateText of eventMapKeys) {
        events.push(...(props.eventMap.get(dateText) ?? []));
      }
      setEventMapKeys(eventMapKeys);
      setEvents(events);
    }
  }, [props.eventMap]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const EventContainer = (props2: { dateText: string }) => {
    const { events } = useStore();
    const filteredEvents = [];
    for (let val of events) {
      if (
        !val.isAllday &&
        val.endTimeText <= props2.dateText + " 23:59:59" &&
        val.startTimeText >= props2.dateText
      ) {
        filteredEvents.push(val);
      }
    }

    return (
      <div className={style.event_container}>
        {filteredEvents.map((val) => {
          return (
            <Event
              key={generateRandomId(12)}
              data={val}
              isMounted={props.isMounted}
              onClickEvent={props.onClickEvent}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={style.viewer}>
      <div className={style.header}>
        {props.dayList.length > 1 && (
          <div className={style.days}>
            <div style={{ minWidth: "80px", maxWidth: "80px" }}></div>
            {props.dayList.map((day) => {
              return (
                <div key={generateRandomId(12)} className={style.day}>
                  {day}
                </div>
              );
            })}
          </div>
        )}
        <div className={style.days}>
          <div style={{ minWidth: "80px", maxWidth: "80px" }}></div>
          {eventMapKeys?.map((dateText) => {
            return (
              <div
                key={generateRandomId(12)}
                className={
                  style.dayEvents +
                  " " +
                  (props.isMounted ? style.isMounted : style.isUnmounted)
                }
              >
                {props.eventMap
                  ?.get(dateText)
                  ?.filter((event) => event.isAllday)
                  .map((event) => {
                    return (
                      <div
                        key={generateRandomId(12)}
                        className={style.dayEvent}
                        onClick={() => props.onClickEvent(event)}
                      >
                        {event.title}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>

      <div className={style.calendar}>
        {TimeLabels()}
        <CurrentTime />
        <div className={style.grid} ref={scrollRef}>
          {props.dayList.map((day, idx) => {
            return (
              <div key={generateRandomId(12)} className={style.column}>
                <RowGrid />
                {eventMapKeys && (
                  <EventContainer dateText={eventMapKeys[idx]} />
                )}
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
