import React, { useEffect, useRef } from "react";
import style from "./style.module.scss";

import { dateFormat } from "functions/functions";

import {
  DateItem,
  EventItem,
  resolveEventColor,
  computeSpanningEvents,
} from "components/calendarV2/calendarData";

type Props = {
  year: number;
  month: number;
  eventMap?: Map<string, EventItem[]>;
  onClickEvent: any;
  onClickCreate?: (date: string) => void;
};

const SPAN_HEIGHT = 20;

const MonthlyView = (props: Props) => {
  const today = new Date();
  const todayString = dateFormat(today, "YYYY-MM-DD");

  const curMonthStartDateItem = new DateItem({
    fields: {
      yyyy: props.year,
      mm: props.month,
      dd: 1,
    },
  });

  const curMonthEndDateItem = new DateItem({
    fields: {
      yyyy: props.year,
      mm: props.month + 1,
      dd: 0,
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef?.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "end",
    });

    return () => {};
  }, []);

  const dateKeys = Array.from(props.eventMap?.keys() ?? []);

  // Group dates into weeks (rows of 7)
  const weeks: string[][] = [];
  for (let i = 0; i < dateKeys.length; i += 7) {
    weeks.push(dateKeys.slice(i, i + 7));
  }

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
      <div className={style.weeks}>
        {weeks.map((weekDates, weekIdx) => {
          const { spans, maxLanes } = computeSpanningEvents(
            weekDates,
            props.eventMap ?? new Map()
          );

          return (
            <div key={weekIdx} className={style.weekRow}>
              {/* Date cells */}
              <div className={style.weekGrid}>
                {weekDates.map((dateText, col) => {
                  const isCurrent =
                    dateText >= curMonthStartDateItem.text &&
                    dateText <= curMonthEndDateItem.text;
                  const singleEvents = (
                    props.eventMap?.get(dateText) ?? []
                  )
                    .filter((e) => !e.duration || e.duration <= 1)
                    .sort((a, b) => {
                      // All-day events first, then by start time
                      if (a.isAllday && !b.isAllday) return -1;
                      if (!a.isAllday && b.isAllday) return 1;
                      return a.startTimeText.localeCompare(b.startTimeText);
                    });

                  return (
                    <div
                      key={col}
                      className={`${style.cell} ${
                        isCurrent ? style.current : ""
                      }`}
                      data-value={dateText}
                      onClick={() => props.onClickCreate?.(dateText)}
                    >
                      <div
                        className={`${style.date} ${
                          todayString === dateText ? style.today : ""
                        }`}
                      >
                        {dateText.split("-")[2]}
                      </div>
                      {maxLanes > 0 && (
                        <div
                          className={style.spanSpacer}
                          style={{ height: `${maxLanes * SPAN_HEIGHT}px` }}
                        />
                      )}
                      {isCurrent && (
                        <div className={style.itemList}>
                          {singleEvents.map((item, itemIdx) => {
                            const color = resolveEventColor(item);
                            return (
                              <div
                                className={style.item}
                                key={itemIdx}
                                style={{
                                  borderLeft: `3px solid ${color}`,
                                  paddingLeft: "4px",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  props.onClickEvent(item);
                                }}
                              >
                                {item.title}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Spanning events overlay */}
              {spans.map((span, spanIdx) => {
                const color = resolveEventColor(span.event);
                const isContinued = span.event.sequence > 1;
                const colsInSpan = span.endCol - span.startCol + 1;
                const isContinuing =
                  span.event.sequence + colsInSpan - 1 <
                  (span.event.duration ?? 1);

                return (
                  <div
                    key={spanIdx}
                    className={style.spanningEvent}
                    style={{
                      left: `calc(${span.startCol} / 7 * 100%${
                        isContinued ? "" : " + 2px"
                      })`,
                      width: `calc(${colsInSpan} / 7 * 100%${
                        isContinued ? "" : " - 2px"
                      }${isContinuing ? "" : " - 2px"})`,
                      top: `${28 + span.lane * SPAN_HEIGHT}px`,
                      backgroundColor: `${color}30`,
                      borderLeft: isContinued
                        ? "none"
                        : `3px solid ${color}`,
                      borderRadius: `${isContinued ? "0" : "3px"} ${
                        isContinuing ? "0" : "3px"
                      } ${isContinuing ? "0" : "3px"} ${
                        isContinued ? "0" : "3px"
                      }`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onClickEvent(span.event);
                    }}
                  >
                    {span.event.title}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyView;
