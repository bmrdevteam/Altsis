import Calendar from "components/calendarV2/Calendar";
import { TRawCalendar } from "components/calendarV2/calendarData";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";
import Navbar from "layout/navbar/Navbar";
import { useEffect, useState } from "react";

import style from "style/pages/admin/schools.module.scss";

export default function Example() {
  const { EnrollmentApi, SyllabusApi } = useApi();
  const { currentUser, currentRegistration, currentSchool } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [rawCalendars, setRawCalendars] = useState<TRawCalendar[]>([]);

  const updateData = async () => {
    const calendars: TRawCalendar[] = [];
    //1. school timetable calendar
    if (currentSchool?.calendarTimetable) {
      calendars.push({
        type: "google",
        from: "schoolCalendarTimetable",
        calendarId: currentSchool.calendarTimetable,
      });
    }

    if (currentRegistration.period) {
      // 2. enrollments
      const enrollments = await EnrollmentApi.REnrolllments({
        season: currentRegistration.season,
        student: currentUser._id,
      });
      if (enrollments.length > 0) {
        calendars.push({
          type: "course",
          from: "enrollments",
          courses: enrollments.filter(
            (enrollment) => !enrollment.isHiddenFromCalendar
          ),
        });
      }

      // 3. mentoring syllabuses
      if (currentRegistration.role === "teacher") {
        const { syllabuses } = await SyllabusApi.RSyllabuses({
          season: currentRegistration.season,
          teacher: currentUser._id,
        });
        if (syllabuses.length > 0) {
          calendars.push({
            type: "course",
            from: "mentorings",
            courses: syllabuses,
          });
        }
      }
    }

    // 4. school calendar
    if (currentSchool?.calendar) {
      calendars.push({
        type: "google",
        from: "schoolCalendar",
        calendarId: currentSchool.calendar,
      });
    }

    // 5. myCalendar
    if (currentUser?.calendar) {
      calendars.push({
        type: "google",
        from: "myCalendar",
        calendarId: currentUser?.calendar,
      });
    }

    setRawCalendars(calendars);
  };

  useEffect(() => {
    if (currentUser && currentRegistration && currentSchool) {
      setIsLoading(true);
    }
    return () => {};
  }, [currentUser, currentRegistration, currentSchool]);

  useEffect(() => {
    if (isLoading) {
      updateData().then(() => {
        setIsLoading(false);
      });
    }
    return () => {};
  }, [isLoading]);

  return (
    <div>
      <Navbar />
      <div className={style.section} style={{ backgroundColor: "white" }}>
        {!isLoading && <Calendar rawCalendars={rawCalendars} />}
      </div>
    </div>
  );
}
