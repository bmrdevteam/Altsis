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
import { useAppNavigate } from "hooks/useAppNavigate";
import style from "style/pages/enrollment.module.scss";

import { useAuth } from "contexts/authContext";

import CourseTable from "pages/courses/table/CourseTable";
import Divider from "components/divider/Divider";
import useAPIv2 from "hooks/useAPIv2";

type Props = {
  courseList: any[];
  updateCourses: () => void;
};

const CoursesMentoring = (props: Props) => {
  const { currentSeason } = useAuth();
  const { EnrollmentAPI } = useAPIv2();
  const navigate = useAppNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [evaluationCounts, setEvaluationCounts] = useState<
    { label: string; filled: number; total: number }[]
  >([]);

  useEffect(() => {
    if (isLoading) {
      props.updateCourses();
      setIsLoading(false);
    }
    return () => {};
  }, [isLoading]);

  useEffect(() => {
    const formEvaluation = currentSeason?.formEvaluation ?? [];
    if (formEvaluation.length === 0 || props.courseList.length === 0) {
      setEvaluationCounts([]);
      return;
    }

    Promise.all(
      props.courseList.map((course) =>
        EnrollmentAPI.REnrollmentsWithEvaluation({
          query: { syllabus: course._id },
        })
      )
    ).then((results) => {
      let totalStudents = 0;
      const counts: Record<string, number> = {};

      for (const field of formEvaluation) {
        counts[field.label] = 0;
      }

      for (const { enrollments } of results) {
        totalStudents += enrollments.length;
        for (const enrollment of enrollments) {
          for (const field of formEvaluation) {
            if (
              enrollment.evaluation?.[field.label]?.toString().trim()
            ) {
              counts[field.label]++;
            }
          }
        }
      }

      setEvaluationCounts(
        formEvaluation.map((field: any) => ({
          label: field.label,
          filled: counts[field.label],
          total: totalStudents,
        }))
      );
    });
  }, [props.courseList, currentSeason]);

  const totalCourses = props.courseList.length;
  const totalPoint = props.courseList.reduce(
    (acc, cur) => acc + (cur.point || 0),
    0
  );
  const totalStudents = props.courseList.reduce(
    (acc, cur) => acc + (cur.count || 0),
    0
  );
  const totalLimit = props.courseList.reduce(
    (acc, cur) => acc + (cur.limit || 0),
    0
  );
  const confirmedCount = props.courseList.filter(
    (course) =>
      course.teachers?.length > 0 &&
      course.teachers.every((t: any) => t.confirmed)
  ).length;

  const summaryItems: { label: string; value: string }[] = [
    { label: "담당 수업", value: `${totalCourses}개` },
    { label: "총 학점", value: `${totalPoint}학점` },
    { label: "총 수강생", value: `${totalStudents}명` },
    { label: "총 정원", value: `${totalLimit}명` },
    { label: "승인 완료", value: `${confirmedCount}/${totalCourses}` },
    ...evaluationCounts.map((ec) => ({
      label: ec.label,
      value: `${ec.filled}/${ec.total}`,
    })),
  ];

  return (
    <>
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
