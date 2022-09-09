/**
 * @file calendar component
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * calendar module
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 * onclick function when selecting with the calendar component
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 */

import React, { useState } from "react";
import Svg from "../../assets/svg/Svg";
import style from "./calender.module.scss";

type Props = {};

/**
 * calendar component
 *
 * @param props
 *
 * @returns calendar component
 *
 * @example <Calendar/>
 *
 * @version 1.0 initial version
 */

const Calender = (props: Props) => {
  /**
   * variable today to indicate the date today
   */
  const today = new Date();

  /**
   * today's date to string to make it easer to compare
   * yyyy-mm-dd format
   */
  const todayString = today.toISOString().split("T")[0];

  /**
   * calendar's current year
   * default set to today's year
   */
  const [year, setYear] = useState<number>(today.getFullYear());
  /**
   * calendar's current month
   * default set to today's month
   * +1 because javascript's month counts from 0
   * 0 ~ 11
   */
  const [month, setMonth] = useState<number>(today.getMonth() + 1);

  /**
   * function that returns an array containing with all the dates in the selected year/month
   *
   * + the first date's day is indicated with empty strings in the front of the array
   *
   * @param yy the year selected
   *
   * @param mm the month selected
   *
   * @returns Array of dates ex)[ '','',1,2,3 ... 30 ]
   *
   * @example createCalender(2022,4)
   */
  function createCalender(yy: number, mm: number) {
    /**
     *  the date object
     */
    const date = new Date();
    /**
     * the array containing all of the dates
     */
    let result = [];
    /**
     * set the time to the first date in the month
     */
    date.setFullYear(yy, mm - 1, 1);
    /**
     * fill the array with empty strings using the getDay() function
     * + getDay() ->  0 ~ 6 : sun ~ sat
     */
    for (let i = 0; i < date.getDay(); i++) {
      result.push("");
    }
    /**
     * set the time to the last date in the month
     */
    date.setFullYear(yy, mm, 0);
    /**
     * fill in the rest of the array till the last date of the month
     */
    for (let i = 0; i < date.getDate(); i++) {
      result.push(i + 1);
    }
    /**
     * return the result
     */
    return result;
  }
  /**
   * function to decrease or increase the month when onclick event triggers on the arrow controls
   *
   * @param cmd left:decrease , right:increase
   *
   * @example handleOnClick("left")
   */
  function handleOnClick(cmd: "left" | "right") {
    if (cmd === "left") {
      if (month === 1) {
        /**
         * if the current selected month is january
         * set the year to the previous year ( -1 )
         * and set the month to december
         */
        setYear((prev) => prev - 1);
        setMonth(12);
      } else {
        /**
         * simply subtract 1 from the current month
         */
        setMonth((prev) => prev - 1);
      }
    }
    if (cmd === "right") {
      if (month === 12) {
        /**
         * if the current selected month is december
         * set the year to the next year ( +1 )
         * and set the month to january
         */
        setYear((prev) => prev + 1);
        setMonth(1);
      } else {
        /**
         * simply add 1 to the current month
         */
        setMonth((prev) => prev + 1);
      }
    }
  }
  /** 
   * return the component    
   */

  return (
    <div className={style.calender_container}>
      <div className={style.calender}>
        <div className={style.top}>
          <div>
            {year}년 {month}월
          </div>
          <div className={style.controls}>
            <div onClick={() => handleOnClick("left")}>
              <Svg type={"chevronLeft"} width="20px" height="20px" />
            </div>
            <div onClick={() => handleOnClick("right")}>
              <Svg type={"chevronRight"} width="20px" height="20px" />
            </div>
          </div>
        </div>
        <div className={style.days}>
          <div className={style.day}>sun</div>
          <div className={style.day}>mon</div>
          <div className={style.day}>tue</div>
          <div className={style.day}>wed</div>
          <div className={style.day}>thu</div>
          <div className={style.day}>fri</div>
          <div className={style.day}>sat</div>
        </div>
        <div className={style.dates}>
          {createCalender(year, month).map(
            (value: number | string, index: number) => {
              const dateStr = `${year}-${month
                .toString()
                .padStart(2, "0")}-${value.toString().padStart(2, "0")}`;
              return (
                <div
                  className={`${style.date} ${
                    todayString === dateStr && style.today
                  }`}
                  key={index}
                  data-value={dateStr}
                >
                  {value}
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
};

export default Calender;
