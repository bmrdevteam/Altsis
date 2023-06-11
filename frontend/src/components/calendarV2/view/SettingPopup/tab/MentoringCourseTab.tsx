import { useAuth } from "contexts/authContext";

import CourseTable from "../table/CourseTable";
import { useEffect, useState } from "react";
import _ from "lodash";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  setIsReloadRequired: React.Dispatch<React.SetStateAction<boolean>>;
};

const Index = (props: Props) => {
  const { currentUser, currentSeason } = useAuth();
  const { SyllabusAPI } = useAPIv2();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syllabusMap, setSyllabusMap] = useState<Map<string, any>>(
    new Map<string, any>()
  );

  const updateHandler = async (e: any) => {
    try {
      const updates = [];
      for (let i = 0; i < e.length; i++) {
        if (
          e[i].tableRowChecked !== syllabusMap.get(e[i]._id).tableRowChecked
        ) {
          if (e[i].tableRowChecked) {
            // show
            updates.push(
              SyllabusAPI.UShowSyllabusOnCalendar({
                params: { _id: e[i]._id },
              })
            );
          } else {
            // hide
            updates.push(
              SyllabusAPI.UHideSyllabusFromCalendar({
                params: { _id: e[i]._id },
              })
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
      SyllabusAPI.RSyllabuses({
        query: {
          season: currentSeason._id,
          teacher: currentUser._id,
        },
      })
        .then(({ syllabuses }) => {
          const syllabusMap = new Map<string, any>();
          for (let syllabus of syllabuses) {
            const teacherIdx = _.findIndex(
              syllabus.teachers,
              (teacher: any) => teacher._id === currentUser._id
            );
            if (teacherIdx !== -1) {
              syllabusMap.set(syllabus._id, {
                ...syllabus,
                teacherIdx,
                tableRowChecked:
                  !syllabus.teachers[teacherIdx].isHiddenFromCalendar,
              });
            }
          }
          setSyllabusMap(syllabusMap);
          setIsLoading(false);
        })
        .catch((err) => {
          ALERT_ERROR(err);
        });
    }

    return () => {};
  }, [isLoading]);

  return (
    <div style={{ marginTop: "24px" }}>
      <CourseTable
        data={!isLoading ? Array.from(syllabusMap.values()) : []}
        subjectLabels={currentSeason?.subjects?.label ?? []}
        onChange={updateHandler}
      />
    </div>
  );
};

export default Index;
