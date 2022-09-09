import React, { useEffect, useRef } from "react";
import style from "../style/pages/home.module.scss";
import TimeTable from "../components/timetable/TimeTable";
import Canvas from "../components/canvas/Canvas";
import Calender from "../components/calender/Calender";

type Props = {};

const Home = (props: Props) => {
  useEffect(() => {
    console.log("effect");

    return () => {};
  }, []);

  return (
    <>
      <div className={style.menu_container}>
        <div className={style.menu_item}></div>
      </div>
      <div className={style.section}>
        <Calender />
      </div>
    </>
  );
};

export default Home;
