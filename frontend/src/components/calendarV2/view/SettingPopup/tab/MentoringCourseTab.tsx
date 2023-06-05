import { useAuth } from "contexts/authContext";

import CourseTable from "../table/CourseTable";
import useApi from "hooks/useApi";
import { useEffect, useState } from "react";
import _ from "lodash";

type Props = {
  setIsReloadRequired: React.Dispatch<React.SetStateAction<boolean>>;
};

const Index = (props: Props) => {
  const { currentUser, currentSeason } = useAuth();
  const { SyllabusApi } = useApi();

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
              SyllabusApi.UShowSyllabusFromCalendar({ _id: e[i]._id })
            );
          } else {
            // hide
            updates.push(
              SyllabusApi.UHideSyllabusFromCalendar({ _id: e[i]._id })
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
      SyllabusApi.RSyllabuses({
        season: currentSeason._id,
        teacher: currentUser._id,
      }).then(({ syllabuses }) => {
        const syllabusMap = new Map<string, any>();
        for (let syllabus of syllabuses) {
          const teacherIdx = _.findIndex(
            syllabus.teachers,
            (teacher: any) => teacher._id === currentUser._id
          );
          if (teacherIdx !== -1) {
            syllabus.teacherIdx = teacherIdx;
            syllabus.tableRowChecked =
              !syllabus.teachers[teacherIdx].isHiddenFromCalendar;
            syllabusMap.set(syllabus._id, syllabus);
          }
        }
        setSyllabusMap(syllabusMap);
        setIsLoading(false);
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
