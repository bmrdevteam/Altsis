import { useEffect, useState } from "react";
import Calendar from "components/calendarV2/Calendar";
import { GoogleCalendarData } from "components/calendarV2/calendarData";
import Navbar from "layout/navbar/Navbar";

import style from "style/pages/admin/schools.module.scss";
import useGoogleAPI from "hooks/useGoogleAPI";
import { useAuth } from "contexts/authContext";
import { getFirstDateOfMonth, getLastDateOfMonth } from "functions/functions";

export default function Example() {
  const { currentWorkspace } = useAuth();
  const { isLoadingToken, CalendarAPI } = useGoogleAPI();
  const [calendar, setCalendar] = useState<GoogleCalendarData>();

  const today = new Date();
  const mm = today.getMonth();
  const yy = today.getFullYear();

  const timeMin = getFirstDateOfMonth(yy, mm).toISOString();
  const timeMax = getLastDateOfMonth(yy, mm).toISOString();

  useEffect(() => {
    if (!isLoadingToken) {
      CalendarAPI.REvents({
        calendarId: currentWorkspace.calendars?.items[4].id,
        queries: {
          timeMin,
          timeMax,
        },
      }).then((res) => {
        setCalendar(res);
      });
    }

    return () => {};
  }, [isLoadingToken]);

  return (
    <div>
      <Navbar />
      <div className={style.section} style={{ backgroundColor: "white" }}>
        <Calendar
          year={2023}
          month={5}
          googleCalendars={calendar ? [calendar] : []}
        />
      </div>
    </div>
  );
}
