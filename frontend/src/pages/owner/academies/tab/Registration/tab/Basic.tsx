/**
 * @file Seasons Page Tab Item - Basic
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

import Input from "components/input/Input";
import Select from "components/select/Select";

import style from "style/pages/admin/schools.module.scss";

type Props = {
  academyId: string;
  registrationData: any;
};

function Basic(props: Props) {
  return (
    <div>
      <div className={style.popup}>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.registrationData.schoolId}
            appearence="flat"
            label="학교 ID"
            required
            disabled
          />
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.registrationData.schoolName}
            appearence="flat"
            label="학교 이름"
            required
            disabled
          />
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.registrationData.year}
            appearence="flat"
            label="학년도"
            required
            disabled
          />
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.registrationData.term}
            appearence="flat"
            label="학기"
            required
            disabled
          />
        </div>

        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.registrationData.userId}
            appearence="flat"
            label="사용자 ID"
            required
            disabled
          />
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.registrationData.userName}
            appearence="flat"
            label="사용자 이름"
            required
            disabled
          />
        </div>

        <div className={style.row}>
          <Select
            style={{ minHeight: "30px" }}
            label="role"
            required
            options={[
              { text: "student", value: "student" },
              { text: "teacher", value: "teacher" },
            ]}
            appearence={"flat"}
            defaultSelectedValue={props.registrationData.role}
          />
        </div>
      </div>
    </div>
  );
}

export default Basic;
