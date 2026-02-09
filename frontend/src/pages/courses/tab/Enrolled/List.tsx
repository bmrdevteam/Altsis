/**
 * @file Enrolled Course List Page
 * @page 수업 - 수강 현황(탭)
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
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";

import style from "style/pages/enrollment.module.scss";
import Divider from "components/divider/Divider";

import CourseTable from "pages/courses/table/CourseTable";
import useAPIv2 from "hooks/useAPIv2";
import _ from "lodash";

type Props = {
  courseList: any[];
};

const List = (props: Props) => {
  const { currentSeason, currentUser, currentRegistration } = useAuth();
  const { EnrollmentAPI } = useAPIv2();
  const navigate = useAppNavigate();

  const [evaluationData, setEvaluationData] = useState<any[]>([]);

  useEffect(() => {
    if (
      currentRegistration?.school &&
      currentUser?._id &&
      currentSeason?.formEvaluation?.length > 0
    ) {
      EnrollmentAPI.REnrollmentsWithEvaluation({
        query: {
          school: currentRegistration.school,
          student: currentUser._id,
        },
      }).then(({ enrollments }) => {
        setEvaluationData(enrollments);
      });
    }
  }, [currentRegistration, currentUser, currentSeason]);

  const totalCourses = props.courseList.length;
  const totalPoint = props.courseList.reduce(
    (acc, cur) => acc + parseInt(cur.point, 10),
    0
  );
  const totalTimeSlots = props.courseList.reduce(
    (acc, cur) => acc + (cur.time?.length || 0),
    0
  );

  const formEvaluation = (currentSeason?.formEvaluation ?? []).filter(
    (f: any) => f.auth?.view?.student
  );
  const evalMap = _.keyBy(evaluationData, "_id");

  const evaluationCounts: { label: string; count: number }[] = [];
  for (const field of formEvaluation) {
    let count = 0;
    for (const course of props.courseList) {
      const evalEntry = evalMap[course._id];
      if (evalEntry?.evaluation?.[field.label]?.toString().trim()) {
        count++;
      }
    }
    evaluationCounts.push({ label: field.label, count });
  }

  const summaryItems: { label: string; value: string }[] = [
    { label: "수강 과목", value: `${totalCourses}과목` },
    { label: "총 학점", value: `${totalPoint}학점` },
    { label: "주간 수업 시수", value: `${totalTimeSlots}시수` },
    ...evaluationCounts.map((ec) => ({
      label: ec.label,
      value: `${ec.count}/${totalCourses}`,
    })),
  ];

  return (
    <div className={style.section}>
      <div className={style.summary_grid}>
        {summaryItems.map((item, i) => (
          <div className={style.summary_item} key={i}>
            <span className={style.summary_label}>{item.label}</span>
            <span className={style.summary_value}>{item.value}</span>
          </div>
        ))}
      </div>
      <Divider />
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
          navigate(`/courses/enrolled/${e._id}`, {
            replace: true,
          });
        }}
      />
    </div>
  );
};

export default List;
