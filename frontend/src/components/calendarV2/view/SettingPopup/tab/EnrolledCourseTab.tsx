import { useAuth } from "contexts/authContext";

import CourseTable from "../table/CourseTable";
import useApi from "hooks/useApi";
import { useEffect, useState } from "react";
import useAPIv2 from "hooks/useAPIv2";

type Props = {
  setIsReloadRequired: React.Dispatch<React.SetStateAction<boolean>>;
};

const Index = (props: Props) => {
  const { currentUser, currentSeason } = useAuth();
  const { EnrollmentApi } = useApi();
  const { EnrollmentAPI } = useAPIv2();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [enrollmentMap, setEnrollmentMap] = useState<Map<string, any>>(
    new Map<string, any>()
  );

  const updateHandler = async (e: any) => {
    try {
      const updates = [];
      for (let i = 0; i < e.length; i++) {
        if (
          e[i].tableRowChecked !== enrollmentMap.get(e[i]._id).tableRowChecked
        ) {
          if (e[i].tableRowChecked) {
            // show
            updates.push(
              EnrollmentApi.UShowEnrollmentFromCalendar({ _id: e[i]._id })
            );
          } else {
            // hide
            updates.push(
              EnrollmentApi.UHideEnrollmentFromCalendar({ _id: e[i]._id })
            );
          }
        }
      }
      if (updates.length > 0) {
        await Promise.all(updates);
        alert(SUCCESS_MESSAGE);
        props.setIsReloadRequired(true);
        setIsLoading(true);
      }
    } catch (err: any) {
      console.error(err);
      alert("error!");
    }
  };

  useEffect(() => {
    if (isLoading && currentSeason?._id && currentUser?._id) {
      EnrollmentAPI.REnrollments({
        query: { season: currentSeason._id, student: currentUser._id },
      }).then(({ enrollments }) => {
        const enrollmentMap = new Map<string, any>();
        for (let enrollment of enrollments) {
          enrollmentMap.set(enrollment._id, {
            ...enrollment,
            tableRowChecked: !enrollment.isHiddenFromCalendar,
          });
        }
        setEnrollmentMap(enrollmentMap);
        setIsLoading(false);
      });
    }

    return () => {};
  }, [isLoading]);

  return (
    <div style={{ marginTop: "24px" }}>
      <CourseTable
        data={!isLoading ? Array.from(enrollmentMap.values()) : []}
        subjectLabels={currentSeason?.subjects?.label ?? []}
        onChange={updateHandler}
      />
    </div>
  );
};

export default Index;
