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
import useDatabase from "hooks/useDatabase";
import { useAuth } from "contexts/authContext";

// tab pages
import View from "./tab/View";
import Edit from "./tab/Edit";

type Props = {};

const Course = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { currentUser, currentRegistration, currentSeason } = useAuth();
  const navigate = useNavigate();

  const [alertPopupActive, setAlertPopupActive] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");

  const database = useDatabase();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [mode, setMode] = useState<string>("view");
  const [courseData, setCourseData] = useState<any>();

  async function getCourseData() {
    const result = await database.R({
      location: `syllabuses/${pid}`,
    });
    return result;
  }

  const checkPermission = () => {
    const permission = currentSeason.permissionSyllabus;
    for (let i = 0; i < permission.length; i++) {
      if (
        permission[i][0] === "userId" &&
        permission[i][1] === currentUser.userId
      ) {
        return permission[i][2];
      }
      if (
        permission[i][0] === "role" &&
        permission[i][1] === currentRegistration.role
      )
        return permission[i][2];
    }
    return false;
  };

  useEffect(() => {
    if (!currentRegistration) {
      setAlertMessage("등록된 학기가 없습니다.");
      setAlertPopupActive(true);
    }
    if (!checkPermission()) {
      setAlertMessage("수업 개설 권한이 없습니다.");
      setAlertPopupActive(true);
    }
    if (isLoading) {
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

export default Course;
