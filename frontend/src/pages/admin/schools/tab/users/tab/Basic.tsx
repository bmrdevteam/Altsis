/**
 * @file User Page Tab Item - Basic
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

import style from "style/pages/admin/schools.module.scss";

// components
import Input from "components/input/Input";

type Props = {
  userData: any;
};

function Basic(props: Props) {
  return (
    <div>
      <div className={style.popup}>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.userData.auth}
            appearence="flat"
            label="auth"
            required
            disabled
          />
        </div>

        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.userData.email}
            appearence="flat"
            label="email"
            onChange={() => {}}
          />
        </div>

        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.userData.tel}
            appearence="flat"
            label="tel"
            onChange={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

export default Basic;
