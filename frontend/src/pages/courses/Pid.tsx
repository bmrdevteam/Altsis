/**
 * @file Courses Pid Page
 *
 * more info on selected courses
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
import { useNavigate, useParams } from "react-router-dom";
import useApi from "hooks/useApi";
import { useAuth } from "contexts/authContext";

// tab pages
import View from "./tab/View";
import Edit from "./tab/Edit";

type Props = {};

const CoursePid = (props: Props) => {
  const { pid } = useParams<"pid">();
  const navigate = useNavigate();
  const { SyllabusApi } = useApi();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [mode, setMode] = useState<string>("view");
  const [courseData, setCourseData] = useState<any>();

  useEffect(() => {
    if (isLoading) {
      navigate("#강의 계획");
      SyllabusApi.RSyllabus(pid)
        .then((result) => {
          setCourseData(result);
          setIsLoading(false);
        })
        .catch((err) => {
          alert(err.response.data.message);
          navigate("/courses");
        });
    }
    return () => {};
  }, [isLoading]);

  return !isLoading ? (
    mode === "view" ? (
      <View
        courseData={courseData}
        setMode={setMode}
        setCourseData={setCourseData}
      />
    ) : (
      <Edit
        courseData={courseData}
        setCourseData={setCourseData}
        setMode={setMode}
      />
    )
  ) : (
    <>로딩중</>
  );
};

export default CoursePid;
