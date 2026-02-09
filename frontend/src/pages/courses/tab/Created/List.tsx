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

type Props = {
  courseList: any[];
};

const CoursesMyList = (props: Props) => {
  const { currentSeason } = useAuth();
  const navigate = useAppNavigate();

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
    { label: "개설 수업", value: `${totalCourses}개` },
    { label: "총 학점", value: `${totalPoint}학점` },
    { label: "총 수강생", value: `${totalStudents}명` },
    { label: "총 정원", value: `${totalLimit}명` },
    { label: "승인 완료", value: `${confirmedCount}/${totalCourses}` },
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
