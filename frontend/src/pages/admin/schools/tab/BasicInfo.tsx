/**
 * @file Schools Pid Page Tab Item - BasicInfo
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

import style from "style/pages/admin/schools.module.scss";

//components
import Input from "../../../../components/input/Input";

type Props = {
  schoolData?: any;
};

const BasicInfo = (props: Props) => {
  return (
    <div className={style.section}>
      <div className={style.form}>
        <div className={style.item}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.schoolData?.schoolId}
            appearence="flat"
            label="학교 ID"
            required
            disabled
          />
        </div>
      </div>
      <div className={style.form} style={{ marginTop: "24px" }}>
        <div className={style.item}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.schoolData.schoolName}
            appearence="flat"
            label="학교 이름"
            required
            disabled
          />
        </div>
      </div>
    </div>
  );
};

export default BasicInfo;
