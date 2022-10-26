/**
 * @file Seasons Page Tab Item - Form
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
import Button from "components/button/Button";
import React from "react";
import style from "style/pages/admin/schools/schools.module.scss";
type Props = {
  seasonData: any;
};
const Form = (props: Props) => {
  return (
    <div className={style.form}>
      <div className={style.item}>
        <div className={style.title}>시간표 양식</div>

        <Button style={{ marginTop: "12px" }} type="ghost">
          시간표1
        </Button>
      </div>
      <div className={style.item}>
        <div className={style.title}>강의 계획서 양식</div>
        <Button style={{ marginTop: "12px" }} type="ghost">
          선택
        </Button>
      </div>
      <div className={style.item}>
        <div className={style.title}>평가 양식</div>
        <Button style={{ marginTop: "12px" }} type="ghost">
          선택
        </Button>
      </div>
    </div>
  );
};

export default Form;
