/**
 * @file Courses Design Page
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
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";

// Navigation Bar
import Navbar from "layout/navbar/Navbar";

// components
import Popup from "components/popup/Popup";
import Button from "components/button/Button";

// tab pages
import Add from "./tab/Add";

type Props = {};

// create new syllabus
const CourseDesign = (props: Props) => {
  const { currentUser, currentRegistration, currentSeason } = useAuth();
  const navigate = useNavigate();

  const [alertPopupActive, setAlertPopupActive] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");

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
    } else if (!checkPermission()) {
      setAlertMessage("수업 개설 권한이 없습니다.");
      setAlertPopupActive(true);
    }
  }, [currentRegistration]);

  return (
    <>
      <Navbar />
      <Add />

      {alertPopupActive && (
        <Popup setState={() => {}} title={alertMessage}>
          <div style={{ marginTop: "24px" }}>
            <Button
              type="ghost"
              onClick={() => {
                setAlertPopupActive(false);
              }}
            >
              확인
            </Button>
          </div>
        </Popup>
      )}
    </>
  );
};

export default CourseDesign;
