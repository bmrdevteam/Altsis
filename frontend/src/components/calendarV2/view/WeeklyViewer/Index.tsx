import React, { useEffect, useMemo, useRef, useState } from "react";
import style from "./style.module.scss";
import { create } from "zustand";

import {
  EventItem,
  resolveEventColor,
  computeSpanningEvents,
} from "components/calendarV2/calendarData";
import { generateRandomId, dateFormat } from "functions/functions";

interface OverlapGroup {
  events: EventItem[];
  startHour: number;
  endHour: number;
}

function parseTimeToHours(timeText: string): number {
  const timePart = timeText.split(" ")[1];
  if (!timePart) return 0;
  const [hh, mm] = timePart.split(":").map(Number);
  return hh + mm / 60;
}

function groupOverlappingEvents(events: EventItem[]): OverlapGroup[] {
  const sorted = [...events].sort((a, b) =>
    a.startTimeText.localeCompare(b.startTimeText)
  );

  const groups: OverlapGroup[] = [];
  for (const event of sorted) {
    const start = parseTimeToHours(event.startTimeText);
    const end = parseTimeToHours(event.endTimeText);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && start < lastGroup.endHour) {
      lastGroup.events.push(event);
      lastGroup.endHour = Math.max(lastGroup.endHour, end);
    } else {
      groups.push({ events: [event], startHour: start, endHour: end });
    }
  }

  return groups;
}

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

const RowFunction = ({
  dateText,
  onClickCreate,
}: {
  dateText: string;
  onClickCreate?: (date: string, time: string) => void;
}) => {
  return (
    <div className={style.row_function}>
      {Array.from(Array(24).keys()).map((val) => {
        return (
          <div
            key={val}
            className={style.block}
            onClick={() => {
              if (onClickCreate) {
                const hour = String(val).padStart(2, "0");
                onClickCreate(dateText, `${hour}:00`);
              }
            }}
          ></div>
        );
      })}
    </div>
  );
};

const Event = ({
  data,
  isMounted,
  onClickEvent,
  customCategoryColors,
}: {
  data: EventItem;
  isMounted: boolean;
  onClickEvent: any;
  customCategoryColors?: Record<string, string>;
}) => {
  const startTime = data.startTimeText.split(" ")[1];
  const endTime = data.endTimeText.split(" ")[1];

  const start =
    parseInt(startTime.split(":")[0]) + parseInt(startTime.split(":")[1]) / 60;
  const end =
    parseInt(endTime.split(":")[0]) + parseInt(endTime.split(":")[1]) / 60;
  const height = end - start;

  const color = resolveEventColor(data, customCategoryColors);

  return (
    <div
      className={
        style.event +
        " " +
        (isMounted ? style.isMounted : style.isUnmounted)
      }
      style={{
        top: `${start * 80}px`,
        height: `${height * 80}px`,
        backgroundColor: `${color}25`,
        borderLeft: `3px solid ${color}`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClickEvent(data);
      }}
    >
      <div className={style.title}>{data.title ?? "제목 없음"}</div>
      {data.location && <div className={style.room}>{data.location}</div>}
      {data.description && (
        <div className={style.room}>{data.description}</div>
      )}
    </div>
  );
};

const MoreEventsDropdown = ({
  group,
  startHour,
  onClickEvent,
  onClose,
  customCategoryColors,
}: {
  group: OverlapGroup;
  startHour: number;
  onClickEvent: (event: EventItem) => void;
  onClose: () => void;
  customCategoryColors?: Record<string, string>;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={style.more_dropdown}
      style={{ top: `${startHour * 80}px` }}
    >
      {group.events.map((event, idx) => {
        const color = resolveEventColor(event, customCategoryColors);
        const startTime = event.startTimeText.split(" ")[1] ?? "";
        const endTime = event.endTimeText.split(" ")[1] ?? "";
        return (
          <div
            key={idx}
            className={style.more_dropdown_item}
            onClick={(e) => {
              e.stopPropagation();
              onClickEvent(event);
              onClose();
            }}
          >
            <span
              className={style.color_dot}
              style={{ backgroundColor: color }}
            />
            <span className={style.event_title}>{event.title ?? "제목 없음"}</span>
            <span className={style.event_time}>
              {startTime} ~ {endTime}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const CurrentTime = () => {
  const [, update] = useState({});
  const currentTimeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  eventMap?: Map<string, EventItem[]>;
  isMounted: boolean;
  dayList: string[];
  onClickEvent: any;
  onClickCreate?: (date: string, time: string) => void;
  customCategoryColors?: Record<string, string>;
  referenceTime?: string | null;
};

const TimeLabels = () => {
  const labels = [<div className={style.label} key="empty"></div>];
  for (let i = 1; i <= 12; i++)
    labels.push(
      <div className={style.label} key={`am-${i}`}>
        {i}:00 AM
      </div>
    );
  for (let i = 1; i < 12; i++)
    labels.push(
      <div className={style.label} key={`pm-${i}`}>
        {i}:00 PM
      </div>
    );
  return <div className={style.time_labels}>{labels}</div>;
};

function WeeklyView(props: Props) {
  const { setEvents } = useStore();
  const [eventMapKeys, setEventMapKeys] = useState<string[]>();

  const todayString = dateFormat(new Date(), "YYYY-MM-DD");

  useEffect(() => {
    if (props.eventMap) {
      const events: EventItem[] = [];
      const eventMapKeys = Array.from(props.eventMap.keys());
      for (let dateText of eventMapKeys) {
        events.push(...(props.eventMap.get(dateText) ?? []));
      }
      setEventMapKeys(eventMapKeys);
      setEvents(events);
    }
  }, [props.eventMap]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Scroll to reference time or current time after layout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (props.referenceTime) {
        // Find the actual scroll container (.viewer_container)
        // DOM: .calendar -> .viewer -> .viewer_container
        const scrollContainer =
          calendarRef.current?.parentElement?.parentElement;
        if (scrollContainer) {
          const [hh, mm] = props.referenceTime.split(":").map(Number);
          const timeOffset = (hh + mm / 60) * 80;
          // scrollTop = timeOffset positions the reference time right below
          // the sticky header, because the header height is accounted for
          // by the layout offset between .viewer top and .calendar top
          scrollContainer.scrollTo({ top: timeOffset, behavior: "smooth" });
        }
      } else {
        // Scroll to current time indicator
        const indicator = calendarRef.current?.querySelector(
          `.${style.current_time}`
        );
        if (indicator) {
          (indicator as HTMLElement).scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [props.referenceTime, props.eventMap]);

  const allDaySpans = useMemo(() => {
    if (!eventMapKeys || !props.eventMap)
      return { spans: [], maxLanes: 0 };
    return computeSpanningEvents(
      eventMapKeys,
      props.eventMap,
      (event) => event.isAllday && !!event.duration && event.duration > 1
    );
  }, [eventMapKeys, props.eventMap]);

  const timedSpans = useMemo(() => {
    if (!eventMapKeys || !props.eventMap)
      return { spans: [], maxLanes: 0 };
    return computeSpanningEvents(
      eventMapKeys,
      props.eventMap,
      (event) => !event.isAllday && !!event.duration && event.duration > 1
    );
  }, [eventMapKeys, props.eventMap]);

  const EventContainer = (props2: { dateText: string }) => {
    const { events } = useStore();
    const [openGroupIdx, setOpenGroupIdx] = useState<number | null>(null);

    const filteredEvents: EventItem[] = [];
    for (let val of events) {
      if (
        !val.isAllday &&
        !(val.duration && val.duration > 1) &&
        val.endTimeText <= props2.dateText + " 23:59:59" &&
        val.startTimeText >= props2.dateText
      ) {
        filteredEvents.push(val);
      }
    }

    const groups = useMemo(
      () => groupOverlappingEvents(filteredEvents),
      [filteredEvents]
    );

    return (
      <div className={style.event_container}>
        {groups.map((group, gIdx) => {
          if (group.events.length === 1) {
            return (
              <Event
                key={`${group.events[0].eventId || group.events[0].id}-${gIdx}`}
                data={group.events[0]}
                isMounted={props.isMounted}
                onClickEvent={props.onClickEvent}
                customCategoryColors={props.customCategoryColors}
              />
            );
          }

          const firstEvent = group.events[0];
          return (
            <React.Fragment key={`group-${gIdx}`}>
              <Event
                data={firstEvent}
                isMounted={props.isMounted}
                onClickEvent={props.onClickEvent}
                customCategoryColors={props.customCategoryColors}
              />
              <div
                className={style.more_badge}
                style={{ top: `${group.startHour * 80}px` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenGroupIdx(openGroupIdx === gIdx ? null : gIdx);
                }}
              >
                +{group.events.length - 1} 더보기
              </div>
              {openGroupIdx === gIdx && (
                <MoreEventsDropdown
                  group={group}
                  startHour={group.startHour}
                  onClickEvent={props.onClickEvent}
                  onClose={() => setOpenGroupIdx(null)}
                  customCategoryColors={props.customCategoryColors}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className={style.viewer}>
      <div className={style.header}>
        {/* Day names + dates row */}
        <div className={style.days}>
          <div style={{ minWidth: "80px", maxWidth: "80px" }}></div>
          {props.dayList.map((day, idx) => {
            const dateText = eventMapKeys?.[idx];
            const dateNum = dateText ? parseInt(dateText.split("-")[2]) : "";
            const isToday = dateText === todayString;
            return (
              <div key={`day-${idx}`} className={style.day}>
                <div className={style.dayName}>{day}</div>
                {dateText && (
                  <div
                    className={`${style.dayDate} ${
                      isToday ? style.today : ""
                    }`}
                  >
                    {dateNum}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* All-day events row */}
        <div className={style.days}>
          <div style={{ minWidth: "80px", maxWidth: "80px" }}></div>
          <div
            className={
              style.alldayContainer +
              " " +
              (props.isMounted ? style.isMounted : style.isUnmounted)
            }
          >
            {/* Spanning all-day events */}
            {allDaySpans.spans.map((span, idx) => {
              const color = resolveEventColor(span.event, props.customCategoryColors);
              const totalCols = eventMapKeys!.length;
              const colsInSpan = span.endCol - span.startCol + 1;
              const isContinued = span.event.sequence > 1;
              const isContinuing =
                span.event.sequence + colsInSpan - 1 <
                (span.event.duration ?? 1);

              return (
                <div
                  key={`span-${idx}`}
                  className={style.spanningAlldayEvent}
                  style={{
                    left: `calc(${span.startCol} / ${totalCols} * 100%${
                      isContinued ? "" : " + 1px"
                    })`,
                    width: `calc(${colsInSpan} / ${totalCols} * 100%${
                      isContinued ? "" : " - 1px"
                    }${isContinuing ? "" : " - 1px"})`,
                    top: `${span.lane * 24}px`,
                    backgroundColor: `${color}30`,
                    borderLeft: isContinued
                      ? "none"
                      : `3px solid ${color}`,
                    borderRadius: `${isContinued ? "0" : "4px"} ${
                      isContinuing ? "0" : "4px"
                    } ${isContinuing ? "0" : "4px"} ${
                      isContinued ? "0" : "4px"
                    }`,
                  }}
                  onClick={() => props.onClickEvent(span.event)}
                >
                  {span.event.title}
                </div>
              );
            })}

            {/* Per-column single all-day events */}
            {eventMapKeys?.map((dateText, idx) => {
              const singleEvents =
                props.eventMap
                  ?.get(dateText)
                  ?.filter(
                    (e) =>
                      e.isAllday && (!e.duration || e.duration <= 1)
                  ) ?? [];

              return (
                <div key={`allday-${idx}`} className={style.dayEventsColumn}>
                  {allDaySpans.maxLanes > 0 && (
                    <div
                      style={{
                        height: `${allDaySpans.maxLanes * 24}px`,
                      }}
                    />
                  )}
                  {singleEvents.map((event, eventIdx) => {
                    const color = resolveEventColor(event, props.customCategoryColors);
                    return (
                      <div
                        key={`allday-event-${eventIdx}`}
                        className={style.dayEvent}
                        style={{
                          backgroundColor: `${color}30`,
                          borderLeft: `3px solid ${color}`,
                        }}
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
      </div>

      <div className={style.calendar} ref={calendarRef}>
        {TimeLabels()}
        <CurrentTime />
        <div className={style.grid} ref={scrollRef}>
          {props.dayList.map((day, idx) => {
            const dateText = eventMapKeys?.[idx] || "";
            return (
              <div key={`col-${idx}`} className={style.column}>
                <RowGrid />
                {eventMapKeys && (
                  <EventContainer dateText={eventMapKeys[idx]} />
                )}
                <RowFunction
                  dateText={dateText}
                  onClickCreate={props.onClickCreate}
                />
              </div>
            );
          })}
          {/* Timed spanning events (recurring events across consecutive days) */}
          {timedSpans.spans.map((span, idx) => {
            const color = resolveEventColor(span.event, props.customCategoryColors);
            const totalCols = eventMapKeys!.length;
            const colsInSpan = span.endCol - span.startCol + 1;
            const startTime = parseTimeToHours(span.event.startTimeText);
            const endTime = parseTimeToHours(span.event.endTimeText);
            const height = endTime - startTime;

            return (
              <div
                key={`timed-span-${idx}`}
                className={style.timedSpanEvent}
                style={{
                  top: `${startTime * 80}px`,
                  height: `${height * 80}px`,
                  left: `calc(${span.startCol} / ${totalCols} * 100%)`,
                  width: `calc(${colsInSpan} / ${totalCols} * 100%)`,
                  backgroundColor: `${color}25`,
                  borderLeft: `3px solid ${color}`,
                }}
                onClick={() => props.onClickEvent(span.event)}
              >
                <div className={style.title}>
                  {span.event.title ?? "제목 없음"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default WeeklyView;
