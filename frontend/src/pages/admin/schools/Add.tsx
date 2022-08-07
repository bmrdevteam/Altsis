import React from "react";
import NavigationLinks from "../../../components/navigationLinks/NavigationLinks";
import style from "../../../style/pages/admin/schools/schools.module.scss";
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
