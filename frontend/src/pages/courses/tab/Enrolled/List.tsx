/**
 * @file Enrolled Course List Page
 * @page 수업 - 수강 현황(탭)
 */

import { useEffect, useState } from "react";
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";

import style from "style/pages/enrollment.module.scss";
import Divider from "components/divider/Divider";

import CourseTable from "pages/courses/table/CourseTable";
import EnrollFilterBar from "pages/courses/EnrollFilterBar";
import { useCourseListFilter } from "pages/courses/useCourseListFilter";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { computeEnrolledSummary } from "utils/computeCourseSummaries";
const SUCCESS_MESSAGE = "취소되었습니다.";

type Props = {
  courseList: any[];
  updateCourses?: () => Promise<void> | void;
  evaluationBySyllabusId?: Record<string, "없음" | "대기" | "평가중" | "완료">;
};

const List = (props: Props) => {
  const { currentSeason, currentUser, currentRegistration } = useAuth();
  const { EnrollmentAPI } = useAPIv2();
  const navigate = useAppNavigate();
  const canCancel = !!currentRegistration?.permissionEnrollmentV2;

  const [evaluationData, setEvaluationData] = useState<any[]>([]);

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
    storageKey: "courses.enrolled",
    subjectLabels,
  });

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

  const maxCredit = currentSeason?.maxCredit ?? 0;
  const minCredit = currentSeason?.minCredit ?? 0;
  const totalPoint = props.courseList.reduce(
    (acc, cur) => acc + (parseInt(cur.point, 10) || 0),
    0
  );
  const isOverMaxCredit = maxCredit > 0 && totalPoint > maxCredit;

  const summaryItems = computeEnrolledSummary({
    courseList: props.courseList,
    formEvaluation: currentSeason?.formEvaluation ?? [],
    evaluationData,
    maxCredit,
    minCredit,
  });

  const displayedCourseList = filterCourses(props.courseList);

  return (
    <div className={style.tab_panel}>
      <div className={style.summary_grid}>
        {summaryItems.map((item, i) => (
          <div
            className={`${style.summary_item}${
              item.warning ? ` ${style.warning}` : ""
            }`}
            key={i}
          >
            <span className={style.summary_label}>{item.label}</span>
            <span className={style.summary_value}>{item.value}</span>
          </div>
        ))}
      </div>
      {isOverMaxCredit && (
        <div className={style.summary_warning}>
          최대 신청 학점({maxCredit})을 초과했습니다. 일부 수업을 취소해주세요.
        </div>
      )}
      <Divider />
      <EnrollFilterBar
        keyword={keyword}
        columns={columnOptions}
        visibleKeys={effectiveVisibleColumns}
        onToggleColumn={handleColumnToggle}
        onShowAll={handleShowAll}
        onReset={handleFilterReset}
        totalCount={props.courseList.length}
        ariaLabel="수강 현황 보기 설정"
      />
      <CourseTable
        data={displayedCourseList}
        searchValue={keyword}
        onSearchChange={setKeyword}
        visibleKeys={effectiveVisibleColumns}
        subjectLabels={subjectLabels}
        preHeaderList={[
          ...(canCancel
            ? [
                {
                  text: "취소",
                  key: "cancel",
                  type: "button" as const,
                  width: "72px",
                  textAlign: "center" as const,
                  btnStyle: {
                    border: true,
                    color: "red",
                    padding: "4px",
                    round: true,
                  },
                  onClick: (e: any) => {
                    if (
                      window.confirm(
                        `'${e.classTitle || e.name || "수업"}' 수강을 취소하시겠습니까?`
                      ) !== true
                    ) {
                      return;
                    }
                    EnrollmentAPI.DEnrollment({ params: { _id: e._id } })
                      .then(() => {
                        alert(SUCCESS_MESSAGE);
                        props.updateCourses?.();
                      })
                      .catch((err) => {
                        ALERT_ERROR(err);
                      });
                  },
                },
              ]
            : []),
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
        evaluationBySyllabusId={props.evaluationBySyllabusId}
      />
    </div>
  );
};

export default List;
