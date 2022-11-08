/**
 * @file Home Page
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 * @version 1.0
 *
 */

import React, { useEffect, useRef, useState } from "react";
import style from "../../style/pages/home.module.scss";
import TimeTable from "../../components/timetable/TimeTable";
import Canvas from "../../components/canvas/Canvas";
import Calender from "../../components/calender/Calender";
import QuickSearch from "../../components/quickSearch/QuickSearch";
import Navbar from "../../layout/navbar/Navbar";
import Schedule from "components/schedule/Schedule";

const Home = () => {
  useEffect(() => {
    return () => {};
  }, []);

  return (
    <>
      <QuickSearch />
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>일정</div>

        <Schedule />
      </div>
    </>
  );
};

export default Home;
