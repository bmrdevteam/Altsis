/**
 * @file Mentoring Course List Page
 * @page 수업 - 담당 수업(탭)
 *
 * @author jessie129j <jessie129j@gmail.com>
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
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import style from "style/pages/enrollment.module.scss";

import { useAuth } from "contexts/authContext";

import CourseTable from "pages/courses/table/CourseTable";

type Props = {
  courseList: any[];
  updateCourses: () => void;
};

const CoursesMentoring = (props: Props) => {
  const { currentSeason } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isLoading) {
      props.updateCourses();
      setIsLoading(false);
    }
    return () => {};
  }, [isLoading]);

  return (
    <>
      <div className={style.section}>
        <CourseTable
          data={props.courseList}
          subjectLabels={currentSeason?.subjects?.label ?? []}
          preHeaderList={[
            {
              text: "No",
              type: "text",
              key: "tableRowIndex",
              width: "48px",
              textAlign: "center",
              whiteSpace: "pre",
            },
          ]}
          onClickDetail={(e: any) => {
            navigate(`/courses/mentoring/${e._id}`, {
              replace: true,
            });
          }}
          showStatus={true}
          isMentor={true}
          setIsLoading={setIsLoading}
        />
      </div>
    </>
  );
};

export default CoursesMentoring;
