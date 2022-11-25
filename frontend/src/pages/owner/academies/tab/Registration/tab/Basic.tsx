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

import { useState } from "react";
import useDatabase from "hooks/useDatabase";

import Button from "components/button/Button";
import Input from "components/input/Input";
import Select from "components/select/Select";

import style from "style/pages/admin/schools.module.scss";

type Props = {
  academy: string;
  registrationData: any;
};

function Basic(props: Props) {
  const database = useDatabase();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [auth, setAuth] = useState<string>(props.registrationData.auth);

  async function updateUser() {
    const result = database.U({
      location: `academies/${props.academy}/registrations/${props.registrationData._id}`,
      data: {
        auth,
      },
    });
    return result;
  }

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
            label="auth"
            required
            options={[
              { text: "member", value: "member" },
              { text: "manager", value: "manager" },
            ]}
            setValue={setAuth}
            appearence={"flat"}
          />
        </div>

        <Button
          type={"ghost"}
          disabled={isLoading}
          onClick={() => {
            setIsLoading(true);
            updateUser()
              .then(() => {
                alert("저장 성공");
                setIsLoading(false);
              })
              .catch(() => {
                alert("저장 실패");
                setIsLoading(false);
              });
          }}
          style={{
            borderRadius: "4px",
            marginTop: "24px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
        >
          {isLoading ? "저장중" : "저장"}
        </Button>
      </div>
    </div>
  );
}

export default Basic;
