import Schedule from "components/schedule/Schedule";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import useApi from "hooks/useApi";
import { useEffect, useState } from "react";

type Props = {
  user: any;
};

const ScheduleTab = (props: Props) => {
  const { EnrollmentAPI } = useAPIv2();
  const { currentSeason, currentRegistration } = useAuth();

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
        result.push({
          id: element._id,
          type: "memo",
          classroom: element.classroom,
          title: element.title,
          startTime: element.start,
          endTime: element.end,
          day: element.day,
          _id: element._id,
          memo: element.memo,
        });
      }
      return result;
    }
  }

  // Get user enrollments in current season
  useEffect(() => {
    if (currentRegistration?._id && props.user) {
      EnrollmentAPI.REnrollments({
        query: { season: currentRegistration.season, student: props.user._id },
      })
        .then(({ enrollments }) => {
          setEnrollments(enrollments);
        })
        .catch((err) => {
          ALERT_ERROR(err);
        });
    }
  }, [currentRegistration, props.user]);

  return (
    <div
      style={{
        height: "calc(100vh - 340px",
        minHeight: "240px",
      }}
    >
      <Schedule
        dayArray={["월", "화", "수", "목", "금"]}
        defaultEvents={[
          ...(enrollmentsToEvents(enrollments) || []),
          ...(memosToEvents(props.user?.memos) || []),
        ]}
        title={`${currentSeason?.year ?? ""} ${currentSeason?.term ?? ""} 일정`}
        mode="view"
      />
    </div>
  );
};

export default ScheduleTab;
