/**
 * @file School Add Page
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
 * - School Add Page -> move to popup component in <Schools Index Page>
 * 
 * -------------------------------------------------------
 *
 * NOTES
 * 
 * 
 * 
 * @version 1.0
 *
 */

import React from "react";
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import style from "style/pages/admin/schools.module.scss";
type Props = {};

const SchoolAdd = (props: Props) => {
  return (
    <div className={style.section}>
      <NavigationLinks />
      <div className={style.title}>학교추가</div>
    </div>
  );
};

export default SchoolAdd;
