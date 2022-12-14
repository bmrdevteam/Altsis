/**
 * @file Owner Page
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
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";

import Navbar from "layout/navbar/Navbar";
import style from "style/pages/owner/academy.module.scss";

type Props = {};

const Academies = (props: Props) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (currentUser.auth !== "owner") {
      alert("접근 권한이 없습니다.");
      navigate("/");
    } else {
      setIsAuthenticated(true);
    }
  }, [currentUser]);

  return isAuthenticated ? (
    <>
      <Navbar />
      asdfasd
      <div className={style.section}></div>
    </>
  ) : (
    <></>
  );
};

export default Academies;
