import Calendar from "components/calendarV2/Calendar";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";
import Navbar from "layout/navbar/Navbar";
import { useEffect, useState } from "react";

import style from "style/pages/admin/schools.module.scss";

export default function Example() {
  const { EnrollmentApi, SyllabusApi } = useApi();
  const { currentUser, currentRegistration } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [syllabusesMentoring, setSyllabusesMentoring] = useState<any[]>([]);

  const updateData = async () => {
    const enrollments = await EnrollmentApi.REnrolllments({
      season: currentRegistration.season,
      student: currentUser._id,
    });
    if (enrollments.length > 0) {
      setEnrollments(enrollments);
    }
    if (currentRegistration.role === "teacher") {
      const { syllabuses } = await SyllabusApi.RSyllabuses({
        season: currentRegistration.season,
        teacher: currentUser._id,
      });
      if (syllabuses.length > 0) {
        setSyllabusesMentoring(syllabuses);
      }
    }
  };

  useEffect(() => {
    if (
      currentUser?._id &&
      currentRegistration?._id &&
      currentRegistration.period
    ) {
      setIsLoading(true);
    }
    return () => {};
  }, [currentUser, currentRegistration]);

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
        {!isLoading && (
          <Calendar
            enrollments={enrollments}
            syllabuses={syllabusesMentoring}
          />
        )}
      </div>
    </div>
  );
}
