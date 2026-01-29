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
 * @version 2.0
 *
 */

import React from "react";
import style from "../../style/pages/home.module.scss";
import Calendar from "components/calendarV2/Calendar";

const Home = () => {
  return (
    <>
      <div className={style.section} style={{ backgroundColor: "white" }}>
        <Calendar />
      </div>
    </>
  );
};

export default Home;
