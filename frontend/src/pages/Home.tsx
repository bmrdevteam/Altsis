import React, { useEffect } from "react";
import style from '../style/pages/home.module.scss'  
import TimeTable from "../components/timetable/TimeTable";

type Props = {};

const Home = (props: Props) => {
  useEffect(() => {
    console.log("effect");

    return () => {};
  }, []);

  return (
    <div className={style.section}>
      {/* <div className={style.title}>일정</div> */}
      <div ></div>
      
    </div>
  );
};

export default Home;
