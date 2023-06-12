/**
 * @file Myaccount Index Page
 *
 * @author mrgoodway <mrgoodway@gmail.com>
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

import { useEffect, useState } from "react";
import { useAuth } from "contexts/authContext";
import Tab from "components/tab/Tab";
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import style from "style/pages/myaccount/myaccount.module.scss";
import Overview from "./tab/Overview";
import Course from "./tab/Course";
import List from "./tab/List";
import Point from "./tab/Point";
import Nav from "layout/sidebar/sidebar.components";
import Navbar from "layout/navbar/Navbar";

const Myaccount = () => {
  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ flex: "1 1 0" }}>
            <div className={style.title}>나의 정보</div>
            <div className={style.description}>
              당신의 정보를 모두 확인 할 수 있습니다.
            </div>
          </div>
        </div>
        <div style={{ marginBottom: "24px" }}>
          <Tab
            items={{
              기본정보: <Overview />,
              수업: <Course />,
              리스트: <List />,
              포인트: <Point />,
            }}
            align={"flex-start"}
          ></Tab>
        </div>
      </div>
    </>
  );
};

export default Myaccount;
