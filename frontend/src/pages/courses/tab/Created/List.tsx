/**
 * @file Created Course List Page
 * @page 수업 - 개설 수업(탭)
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
import { useAppNavigate } from "hooks/useAppNavigate";
import style from "style/pages/enrollment.module.scss";

import CourseTable from "pages/courses/table/CourseTable";
import { useAuth } from "contexts/authContext";
import Divider from "components/divider/Divider";
import { computeCreatedSummary } from "utils/computeCourseSummaries";

type Props = {
  courseList: any[];
};

const CoursesMyList = (props: Props) => {
  const { currentSeason } = useAuth();
  const navigate = useAppNavigate();

  const summaryItems = computeCreatedSummary(props.courseList);

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
