import React, { useEffect, useRef, useState } from "react";
import style from "../../style/pages/home.module.scss";
import TimeTable from "../../components/timetable/TimeTable";
import Canvas from "../../components/canvas/Canvas";
import Calender from "../../components/calender/Calender";
import QuickSearch from "../../components/quickSearch/QuickSearch";
import Navbar from "../../layout/navbar/Navbar";

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
        <div className={style.overview_container}>
          <div className={style.overview}>
            <div className={style.card}>1</div>
            <div className={style.card}>2</div>
            <div className={style.card}>3</div>
            <div className={style.card}>4</div>
            <div className={style.card}>5</div>
          </div>
        </div>
        <div className={style.schedule_container}>
          <div>
            <div className={style.title}>2022/9/12 월요일</div>
          </div>
          <div className={style.schedule}>
            <div className={style.item}>
              <div className={style.description}>가치의 충돌_이상찬</div>
              <div className={style.controls}>
                <div className={style.time}>9:00 ~ 9:45</div>
                <div className={style.classroom}>101호</div>
              </div>
            </div>
            <div className={style.item}>
              <div className={style.description}>
                재미로 공부해보는 수학수업
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
