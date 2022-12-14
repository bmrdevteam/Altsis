/**
 * @file Admin Page
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

import style from "style/pages/admin/schools.module.scss";

// Navigation Links
import NavigationLinks from "components/navigationLinks/NavigationLinks";

// components
import Divider from "components/divider/Divider";

const Admin = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (currentUser.auth !== "admin" && currentUser.auth !== "manager") {
      alert("접근 권한이 없습니다.");
      navigate("/");
    } else {
      setIsAuthenticated(true);
    }
  }, [currentUser]);

  return isAuthenticated ? (
    <>
      <div className={style.section}>
        <NavigationLinks />
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ flex: "1 1 0" }}>
            <div className={style.title}>관리자 메뉴</div>
            <div className={style.description}>description...</div>
          </div>
        </div>
        <Divider />
      </div>
    </>
  ) : (
    <></>
  );
};

export default Admin;
