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
import _ from "lodash";

// components
import Input from "components/input/Input";
import Textarea from "components/textarea/Textarea";

type Props = {
  userData: any;
};

function Basic(props: Props) {
  return (
    <div className={style.popup}>
      <div
        className={style.label}
        style={{ marginBottom: "0px", marginTop: "24px" }}
      >
        소속 학교
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "12px",
        }}
      >
        <Textarea
          defaultValue={
            props.userData.schools.length !== 0
              ? _.join(
                  props.userData.schools.map(
                    (schoolData: any) => schoolData.schoolName
                  ),
                  "\n"
                )
              : "*가입된 학교 없음"
          }
          disabled
          rows={props.userData.schools?.length || 1}
          style={{ resize: "none" }}
        />
      </div>

      <div style={{ marginTop: "24px" }}>
        <Input
          appearence="flat"
          label="등급"
          defaultValue={props.userData.auth}
          disabled
        />
      </div>

      <div style={{ marginTop: "24px" }}>
        <Input
          appearence="flat"
          label="이메일"
          defaultValue={props.userData.email}
          disabled
        />
      </div>
      <div style={{ marginTop: "24px" }}>
        <Input
          label="tel"
          appearence="flat"
          defaultValue={props.userData.tel}
          disabled
        />
      </div>
    </div>
  );
}

export default Basic;
