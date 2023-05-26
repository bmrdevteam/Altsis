import React, { useEffect, useRef } from "react";
import style from "./style.module.scss";

import { dateFormat } from "functions/functions";

import { DateItem, calendarItem } from "components/calendarV2/calendarData";

type Props = {
  year: number;
  month: number;
  eventMap?: Map<string, calendarItem[]>;
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

const MonthlyView = (props: Props) => {
  const today = new Date();

  const todayString = dateFormat(today, "YYYY-MM-DD"); //yyyy-mm-dd

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
      <div className={style.cells}>
        {Array.from(props.eventMap?.keys() ?? []).map(
          (dateText: string, index: number) => {
            return dateText >= curMonthStartDateItem.text &&
              dateText <= curMonthEndDateItem.text ? (
              <div
                className={`${style.cell} ${style.current} `}
                key={index}
                data-value={dateText}
              >
                <div
                  className={`${style.date} ${
                    todayString === dateText && style.today
                  }`}
                >
                  {dateText.split("-")[2]}
                </div>
                <div className={style.itemList}>
                  {props.eventMap?.get(dateText)?.map((item) => {
                    return (
                      <div
                        className={style.item}
                        onClick={() => {
                          console.log(item);
                        }}
                      >
                        {item.summary}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                className={`${style.cell}`}
                key={index}
                data-value={dateText}
                style={{ color: "gray" }}
              >
                <div className={`${style.date}`}>{dateText.split("-")[2]}</div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};

export default MonthlyView;
