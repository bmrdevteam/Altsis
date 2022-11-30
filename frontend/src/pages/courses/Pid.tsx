/**
 * @file Courses Pid Page
 *
 * more info on selected courses
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
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
import { useNavigate, useParams } from "react-router-dom";
import useDatabase from "hooks/useDatabase";
import { useAuth } from "contexts/authContext";

// components
import Divider from "components/divider/Divider";
import NavigationLinks from "components/navigationLinks/NavigationLinks";

import style from "style/pages/courses/course.module.scss";
import EditorParser from "editor/EditorParser";

import _ from "lodash";

type Props = {};

const Course = (props: Props) => {
  const { pid } = useParams<"pid">();
  const navigate = useNavigate();
  const { currentSeason } = useAuth();

  const database = useDatabase();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [courseData, setCourseData] = useState<any>();

  async function getCourseData() {
    const result = await database.R({
      location: `syllabuses/${pid}`,
    });
    return result;
  }

  const categories = () => {
    const res = [];
    for (let i = 0; i < currentSeason?.subjects.label.length; i++) {
      res.push(
        <div className={style.category}>
          {currentSeason?.subjects.label[i]}: {courseData.subject[i]}
        </div>
      );
    }

    res.push(
      <div className={style.category}>개설자: {courseData.userName}</div>
    );

    res.push(
      <div className={style.category}>
        멘토:{" "}
        {_.join(
          courseData?.teachers.map((teacher: any) => {
            return teacher.userName;
          }),
          ", "
        )}
      </div>
    );

    res.push(
      <div className={style.category}>
        시간:{" "}
        {_.join(
          courseData?.time.map((timeBlock: any) => {
            return timeBlock.label;
          }),
          ", "
        )}
      </div>
    );
    res.push(<div className={style.category}>학점: {courseData.point}</div>);
    res.push(
      <div className={style.category}>
        강의실: {courseData.classroom || "없음"}
      </div>
    );
    return res;
  };

  useEffect(() => {
    navigate("#강의 계획");
    getCourseData()
      .then((result) => {
        setCourseData(result);
        setIsLoading(false);
      })
      .catch((err) => {
        alert(err.response.data.message);
        navigate("/courses");
      });
    return () => {};
  }, []);

  const ClassInfo = () => {
    return (
      <EditorParser
        auth="view"
        defaultValues={courseData}
        data={currentSeason?.formSyllabus}
      />
    );
  };

  return !isLoading ? (
    <div className={style.section}>
      <NavigationLinks />
      <div className={style.title}>{courseData.classTitle}</div>
      <div className={style.categories_container}>
        <div className={style.categories}>{categories()}</div>
      </div>
      <Divider />

      <ClassInfo />
    </div>
  ) : (
    <div>로딩중</div>
  );
};

export default Course;
