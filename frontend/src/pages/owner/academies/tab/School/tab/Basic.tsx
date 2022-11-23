/**
 * @file School Page Tab Item - Basic
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

// components
import Input from "components/input/Input";
import style from "style/pages/admin/schools.module.scss";

type Props = {
  academy: any;
  schoolData: any;
};

function Basic(props: Props) {
  return (
    <div>
      <div className={style.popup}>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.schoolData.schoolId}
            appearence="flat"
            label="학교 ID"
            required
            disabled
          />
        </div>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.schoolData.schoolName}
            appearence="flat"
            label="학교 이름"
            required
            disabled
          />
        </div>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.schoolData.createdAt}
            appearence="flat"
            label="createdAt"
            disabled
          />
        </div>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.schoolData.updatedAt}
            appearence="flat"
            label="updatedAt"
            disabled
          />
        </div>
      </div>
    </div>
  );
}

export default Basic;
