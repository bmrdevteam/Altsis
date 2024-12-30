/**
 * @file Course Design Page
 * @page 수업 개설 페이지
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

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";

// Navigation Bar
import Navbar from "layout/navbar/Navbar";

// tab pages
import Add from "./view/Add/Index";

type Props = {};

// create new syllabus
const CourseDesign = (props: Props) => {
  const { currentRegistration } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentRegistration) {
      alert("등록된 학기가 없습니다.");
      navigate("/");
    } else if (!currentRegistration?.permissionSyllabusV2) {
      alert("수업 개설 권한이 없습니다.");
      navigate("/courses");
    }
  }, [currentRegistration]);

  return (
    <>
      <Navbar />
      <Add />
    </>
  );
};

export default CourseDesign;
