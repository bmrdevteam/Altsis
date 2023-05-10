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

import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";

import style from "style/pages/enrollment.module.scss";
import Divider from "components/divider/Divider";

import CourseTable from "pages/courses/table/CourseTable";

type Props = {
  courseList: any[];
};

const categories = (props: Props) => {
  // 학점 합계 계산
  const totalPoint = props.courseList.reduce(
    (acc, cur) => acc + parseInt(cur.point, 10),
    0
  );
  return (
    <>
      <div className={style.category}>총 {totalPoint}학점</div>
    </>
  );
};

const List = (props: Props) => {
  const { currentSeason } = useAuth();
  const navigate = useNavigate();

  return (
    <div className={style.section}>
      <div className={style.categories_container}>
        <div className={style.categories}>{categories(props)}</div>
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
