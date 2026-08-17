/**
 * @file Mentoring Course List Page
 * @page 수업 - 담당 수업(탭)
 */

import { useEffect, useState } from "react";
import { useAppNavigate } from "hooks/useAppNavigate";
import style from "style/pages/enrollment.module.scss";

import { useAuth } from "contexts/authContext";

import CourseTable from "pages/courses/table/CourseTable";
import EnrollFilterBar from "pages/courses/EnrollFilterBar";
import { useCourseListFilter } from "pages/courses/useCourseListFilter";
import Divider from "components/divider/Divider";
import useAPIv2 from "hooks/useAPIv2";
import {
  aggregateMentoringEvaluationCounts,
  appendEvaluationSummary,
  computeMentoringBaseSummary,
} from "utils/computeCourseSummaries";
type Props = {
  courseList: any[];
  updateCourses: () => void;
  evaluationBySyllabusId?: Record<string, "없음" | "대기" | "평가중" | "완료">;
};

const CoursesMentoring = (props: Props) => {
  const { currentSeason } = useAuth();
  const { EnrollmentAPI } = useAPIv2();
  const navigate = useAppNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [evaluationCounts, setEvaluationCounts] = useState<
    { label: string; filled: number; total: number }[]
  >([]);

  const subjectLabels = currentSeason?.subjects?.label ?? [];
  const {
    keyword,
    setKeyword,
    columnOptions,
    effectiveVisibleColumns,
    handleColumnToggle,
    handleShowAll,
    handleFilterReset,
    filterCourses,
  } = useCourseListFilter({
    storageKey: "courses.mentoring",
    subjectLabels,
  });

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
      setEvaluationCounts(
        aggregateMentoringEvaluationCounts({
          formEvaluation,
          enrollmentResults: results,
        })
      );
    });
  }, [props.courseList, currentSeason]);

  const summaryItems = appendEvaluationSummary(
    computeMentoringBaseSummary(props.courseList),
    evaluationCounts
  );
  const displayedCourseList = filterCourses(props.courseList);

  return (
    <>
      <div className={style.tab_panel}>
        <div className={style.summary_grid}>
          {summaryItems.map((item, i) => (
            <div className={style.summary_item} key={i}>
              <span className={style.summary_label}>{item.label}</span>
              <span className={style.summary_value}>{item.value}</span>
            </div>
          ))}
        </div>
        <Divider />
        <EnrollFilterBar
          keyword={keyword}
          columns={columnOptions}
          visibleKeys={effectiveVisibleColumns}
          onToggleColumn={handleColumnToggle}
          onShowAll={handleShowAll}
          onReset={handleFilterReset}
          totalCount={props.courseList.length}
          ariaLabel="담당 수업 보기 설정"
        />
        <CourseTable
          data={displayedCourseList}
          searchValue={keyword}
          onSearchChange={setKeyword}
          visibleKeys={effectiveVisibleColumns}
          subjectLabels={subjectLabels}
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
          evaluationBySyllabusId={props.evaluationBySyllabusId}
        />
      </div>
    </>
  );
};

export default CoursesMentoring;
