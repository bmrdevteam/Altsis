/**
 * @file Created Course List Page
 * @page 수업 - 개설 수업(탭)
 */

import { useAppNavigate } from "hooks/useAppNavigate";
import style from "style/pages/enrollment.module.scss";

import CourseTable from "pages/courses/table/CourseTable";
import EnrollFilterBar from "pages/courses/EnrollFilterBar";
import { useCourseListFilter } from "pages/courses/useCourseListFilter";
import { useAuth } from "contexts/authContext";
import Divider from "components/divider/Divider";
import { computeCreatedSummary } from "utils/computeCourseSummaries";

type Props = {
  courseList: any[];
};

const CoursesMyList = (props: Props) => {
  const { currentSeason } = useAuth();
  const navigate = useAppNavigate();

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
    storageKey: "courses.created",
    subjectLabels,
  });

  const summaryItems = computeCreatedSummary(props.courseList);
  const displayedCourseList = filterCourses(props.courseList);

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
        <EnrollFilterBar
          keyword={keyword}
          columns={columnOptions}
          visibleKeys={effectiveVisibleColumns}
          onToggleColumn={handleColumnToggle}
          onShowAll={handleShowAll}
          onReset={handleFilterReset}
          totalCount={props.courseList.length}
          ariaLabel="개설 수업 보기 설정"
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
          showStatus={true}
          onClickDetail={(e: any) => {
            navigate(`/courses/created/${e._id}`, {
              replace: true,
            });
          }}
        />
      </div>
    </>
  );
};

export default CoursesMyList;
