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
import QuickSearch from "../../components/quickSearch/QuickSearch";
import Navbar from "../../layout/navbar/Navbar";
import Schedule from "components/schedule/Schedule";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";

const Home = () => {
  const { EnrollmentApi } = useApi();

  const { currentUser, currentRegistration } = useAuth();
  const [enrollments, setEnrollments] = useState<any>();

  function enrollmentsToEvents(data: any[]) {
    if (data) {
      let result: any[] = [];
      for (let i = 0; i < data.length; i++) {
        const element = data[i];

        if (element?.time.length <= 1) {
          result.push({
            id: element._id + JSON.stringify(element?.time[0]),
            type: "course",
            classroom: element.classroom,
            title: element.classTitle,
            startTime: element?.time[0].start,
            endTime: element?.time[0].end,
            day: element?.time[0].day,
            _id: element._id,
            memo: element?.memo,
          });
        } else {
          for (let ii = 0; ii < element?.time.length; ii++) {
            const time = element?.time[ii];
            result.push({
              id: element._id + JSON.stringify(time),
              title: element.classTitle,
              type: "course",
              classroom: element.classroom,
              startTime: time.start,
              endTime: time.end,
              day: time.day,
              _id: element._id,
              memo: element?.memo,
            });
          }
        }
      }
      return result;
    }
  }

  function memosToEvents(data: any[]) {
    if (data) {
      let result: any[] = [];
      for (let i = 0; i < data.length; i++) {
        const element = data[i];
        console.log(element);
        result.push({
          id: element._id,
          type: "memo",
          classroom: element.classroom,
          title: element.title,
          startTime: element.start,
          endTime: element.end,
          day: element.day,
          _id: element._id,
        });
      }
      return result;
    }
  }

  useEffect(() => {
    if (currentRegistration?._id) {
      EnrollmentApi.REnrolllments({
        season: currentRegistration.season,
        student: currentUser._id,
      })
        .then((res) => {
          setEnrollments(res);
          console.log(res);
        })
        .catch(() => {});
    }
  }, [currentRegistration]);

  return (
    <>
      <QuickSearch />
      <Navbar />
      <div className={style.section}>
        <Schedule
          dayArray={["월", "화", "수", "목", "금"]}
          defaultEvents={[
            ...(enrollmentsToEvents(enrollments) || []),
            ...(memosToEvents(currentRegistration?.memos) || []),
          ]}
          title={`${currentRegistration?.year ?? ""} ${
            currentRegistration?.term ?? ""
          } 일정`}
        />
      </div>
    </>
  );
};

export default Home;
