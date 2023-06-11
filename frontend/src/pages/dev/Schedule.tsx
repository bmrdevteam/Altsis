import Calendar from "components/calendarV2/Calendar";
import { TRawCalendar } from "components/calendarV2/calendarData";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import useApi from "hooks/useApi";
import Navbar from "layout/navbar/Navbar";
import _ from "lodash";
import { useEffect, useState } from "react";

import style from "style/pages/admin/schools.module.scss";

export default function Example() {
  const { EnrollmentApi } = useApi();
  const { SyllabusAPI } = useAPIv2();
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
        try {
          const { syllabuses } = await SyllabusAPI.RSyllabuses({
            query: {
              season: currentRegistration.season,
              teacher: currentUser._id,
            },
          });
          if (syllabuses.length > 0) {
            const courses = [];
            for (let syllabus of syllabuses) {
              const teacherIdx = _.findIndex(
                syllabus.teachers,
                (teacher: any) => teacher._id === currentUser._id
              );
              if (
                teacherIdx !== -1 &&
                !syllabus.teachers[teacherIdx].isHiddenFromCalendar
              ) {
                courses.push(syllabus);
              }
            }

            calendars.push({
              type: "course",
              from: "mentorings",
              courses,
            });
          }
        } catch (err) {
          ALERT_ERROR(err);
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
