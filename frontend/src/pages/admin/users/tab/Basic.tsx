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

import { useState } from "react";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Select from "components/select/Select";

type Props = {
  academy: string;
  userData: any;
};

function Basic(props: Props) {
  const database = useDatabase();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /* document fields */
  const [auth, setAuth] = useState<string>(props.userData.auth);
  const [email, setEmail] = useState<string>(props.userData.email || undefined);
  const [tel, setTel] = useState<string>(props.userData.tel || undefined);

  async function updateUser() {
    const result = database.U({
      location: `academies/${props.academy}/users/${props.userData._id}`,
      data: {
        auth,
        email,
        tel,
      },
    });
    return result;
  }

  return (
    <div>
      <div className={style.popup}>
        <div className={style.row}>
          <Select
            style={{ minHeight: "30px" }}
            label="auth"
            required
            options={[
              { text: "member", value: "member" },
              { text: "manager", value: "manager" },
              { text: "admin", value: "admin" },
            ]}
            setValue={setAuth}
            appearence={"flat"}
            defaultSelectedValue={auth}
          />
        </div>

        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.userData.schools[0]?.schoolId}
            appearence="flat"
            label="학교 ID"
            required
            disabled
          />
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.userData.schools[0]?.schoolName}
            appearence="flat"
            label="학교 이름"
            required
            disabled
          />
        </div>

        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.userData.userId}
            appearence="flat"
            label="사용자 ID"
            required
            disabled
          />

          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.userData.userName}
            appearence="flat"
            label="사용자 이름"
            required
            disabled
          />
        </div>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={email}
            appearence="flat"
            label="email"
            onChange={(e: any) => {
              setEmail(e.target.value);
            }}
          />
        </div>

        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={tel}
            appearence="flat"
            label="tel"
            onChange={(e: any) => {
              setTel(e.target.value);
            }}
          />
        </div>

        <Button
          type={"ghost"}
          disabled={isLoading}
          onClick={(e: any) => {
            setIsLoading(true);
            updateUser()
              .then(() => {
                alert("success");
              })
              .catch((err) => {
                alert(err.response.data.message);
              });
            setIsLoading(false);
          }}
          style={{
            borderRadius: "4px",
            marginTop: "24px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
        >
          수정하기
        </Button>
      </div>
    </div>
  );
}

export default Basic;
