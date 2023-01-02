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
import useApi from "hooks/useApi";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Select from "components/select/Select";

type Props = {
  academyId: string;
  school: any;
};

function Basic(props: Props) {
  const database = useDatabase();
  const { AcademyApi } = useApi();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /* document fields */
  const [auth, setAuth] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [email, setEmail] = useState<any>(undefined);
  const [tel, setTel] = useState<any>(undefined);

  async function addDocument() {
    const result = await database.C({
      location: `academies/${props.academyId}/users`,
      data: {
        auth,
        userId,
        userName,
        password,
        tel,
        email,

        schools: props.school
          ? [
              {
                school: props.school._id,
                schoolId: props.school.schoolId,
                schoolName: props.school.schoolName,
              },
            ]
          : [],
      },
    });
    return result;
  }

  return (
    <div>
      <div className={style.popup}>
        <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
          <Input
            appearence="flat"
            label="학교 ID"
            required={true}
            disabled={true}
            defaultValue={props.school.schoolId}
          />
          <Input
            appearence="flat"
            label="학교 이름"
            required={true}
            disabled={true}
            defaultValue={props.school.schoolName}
          />
        </div>

        <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
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

        <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
          <Input
            key="userId"
            appearence="flat"
            label="userId"
            required={true}
            onChange={(e: any) => {
              setUserId(e.target.value);
            }}
          />
          <Input
            appearence="flat"
            label="password"
            required={true}
            onChange={(e: any) => {
              setPassword(e.target.value);
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
          <Input
            appearence="flat"
            label="userName"
            required={true}
            onChange={(e: any) => {
              setUserName(e.target.value);
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
          <Input
            appearence="flat"
            label="email"
            onChange={(e: any) => {
              setEmail(e.target.value);
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
          <Input
            appearence="flat"
            label="tel"
            onChange={(e: any) => {
              setTel(e.target.value);
            }}
          />
        </div>

        <Button
          type={"ghost"}
          onClick={() => {
            AcademyApi.CAcademyDocument({
              academyId: props.academyId,
              type: "users",
              data: {
                auth,
                userId,
                userName,
                password,
                tel,
                email,

                schools: props.school
                  ? [
                      {
                        school: props.school._id,
                        schoolId: props.school.schoolId,
                        schoolName: props.school.schoolName,
                      },
                    ]
                  : [],
              },
            })
              .then(() => {
                alert("success");
              })
              .catch((err) => {
                alert(err.response.data.message);
              });
          }}
          style={{
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            marginTop: "24px",
          }}
        >
          생성
        </Button>
      </div>
    </div>
  );
}

export default Basic;
