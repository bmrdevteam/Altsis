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

import Navbar from "layout/navbar/Navbar";
import style from "style/pages/owner/academy.module.scss";

type Props = {};

const Academies = (props: Props) => {
  return (
    <>
      <Navbar />
      <div className={style.section}></div>
    </>
  );
};

export default Academies;
