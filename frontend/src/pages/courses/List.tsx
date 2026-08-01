/**
 * @file Courses List Page
 * @page 수업 목록 페이지 (전체 목록)
 */

import { useEffect, useState } from "react";
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";

import style from "style/pages/enrollment.module.scss";

import Loading from "components/loading/Loading";

import CourseTable from "./table/CourseTable";
import EnrollFilterBar from "./EnrollFilterBar";
import { useCourseListFilter } from "./useCourseListFilter";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {};

const Courses = (props: Props) => {
  const navigate = useAppNavigate();
  const { SyllabusAPI } = useAPIv2();

  const { currentSeason, currentRegistration } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [courseList, setCourseList] = useState<any[]>([]);

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
    storageKey: "courses.list",
    subjectLabels,
  });

  async function getCreatedCourseList() {
    try {
      const { syllabuses } = await SyllabusAPI.RSyllabuses({
        query: {
          season: currentRegistration?.season,
        },
      });
      return syllabuses;
    } catch (err) {
      ALERT_ERROR(err);
    }
  }

  useEffect(() => {
    if (isLoading) {
      if (!currentRegistration) {
        alert("등록된 학기가 없습니다.");
        navigate("/");
      } else {
        getCreatedCourseList().then((res: any) => {
          setCourseList(res);
          setIsLoading(false);
        });
      }
    }
  }, [isLoading]);

  const displayedCourseList = filterCourses(courseList);

  return (
    <>
      <div className={style.section}>
        <div className={style.title}>전체 목록</div>
        {!isLoading ? (
          <>
            <EnrollFilterBar
              keyword={keyword}
              columns={columnOptions}
              visibleKeys={effectiveVisibleColumns}
              onToggleColumn={handleColumnToggle}
              onShowAll={handleShowAll}
              onReset={handleFilterReset}
              totalCount={courseList.length}
              ariaLabel="전체 목록 보기 설정"
            />
            <CourseTable
              defaultPageBy={50}
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
            />
          </>
        ) : (
          <Loading height={"calc(100vh - 55px)"} />
        )}
      </div>
    </>
  );
};

export default Courses;
