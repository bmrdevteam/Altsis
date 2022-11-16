/**
 * @file Courses Index Page
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

import Navbar from "layout/navbar/Navbar";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Table from "../../components/table/Table";
import { courseData } from "../../dummyData/coursesData";
import useDatabase from "../../hooks/useDatabase";
import style from "../../style/pages/courses/course.module.scss";

type Props = {};

const Courses = (props: Props) => {
  return (
    <>
      <Navbar />
      <div className={style.section}>
      
      </div>
    </>
  );
};

export default Courses;
