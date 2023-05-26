import { useEffect, useState } from "react";
import Calendar from "components/calendarV2/Calendar";
import { GoogleCalendarData } from "components/calendarV2/calendarData";
import Navbar from "layout/navbar/Navbar";

import style from "style/pages/admin/schools.module.scss";

export default function Example() {
  return (
    <div>
      <Navbar />
      <div className={style.section} style={{ backgroundColor: "white" }}>
        <Calendar />
      </div>
    </div>
  );
}
