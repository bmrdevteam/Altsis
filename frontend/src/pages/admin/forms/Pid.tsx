/**
 * @file Form Pid Page
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
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";

import useDatabase from "hooks/useDatabase";

import Editor from "../../../editor/Editor";

type Props = {};

const Form = (props: Props) => {
  /**
   * get the page id
   */
  const { pid } = useParams<"pid">();

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

  return isAuthenticated ? <Editor id={pid ?? "idUndefined"} /> : <></>;
};

export default Form;
