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

import { useState, useEffect, useRef } from "react";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Select from "components/select/Select";
import Popup from "components/popup/Popup";

import _ from "lodash";
import Table from "components/table/Table";

type Props = {
  schoolData: any;
  schoolList: any;
  setPopupAcitve: any;
  setIsUserListLoading: any;
};

function Basic(props: Props) {
  const database = useDatabase();

  /* document fields */
  const [auth, setAuth] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [email, setEmail] = useState<any>(undefined);
  const [tel, setTel] = useState<any>(undefined);
  const [schools, setSchools] = useState<any[]>(
    !_.isEmpty(props.schoolData)
      ? [
          {
            school: props.schoolData._id,
            schoolId: props.schoolData.schoolId,
            schoolName: props.schoolData.schoolName,
          },
        ]
      : []
  );
  const [schoolsText, setSchoolsText] = useState<string>("");
  const schoolSelectRef = useRef<any[]>([]);

  /* Popup Activation */
  const [isEditSchoolPopupActive, setIsEditSchoolPopupActive] =
    useState<boolean>(false);

  useEffect(() => {
    setSchoolsText(
      _.join(
        schools.map(
          (schoolData: any) =>
            `${schoolData.schoolName}(${schoolData.schoolId})`
        ),
        ", "
      )
    );
  }, [schools]);

  async function addDocument() {
    const result = await database.C({
      location: `users`,
      data: {
        schools,
        auth,
        userId,
        userName,
        password,
        tel,
        email,
      },
    });
    return result;
  }

  return (
    <>
      {" "}
      <Popup
        setState={props.setPopupAcitve}
        style={{ borderRadius: "8px", maxWidth: "600px", width: "100%" }}
        closeBtn
        title="사용자 생성"
      >
        <div className={style.popup}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "12px",
            }}
          >
            <Input
              label="소속 학교"
              defaultValue={schoolsText}
              appearence="flat"
              disabled
            />
            <Button
              type={"ghost"}
              onClick={() => {
                schoolSelectRef.current = schools;
                setIsEditSchoolPopupActive(true);
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              }}
            >
              수정
            </Button>
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
              addDocument()
                .then(() => {
                  alert("success");
                  props.setIsUserListLoading(true);
                  props.setPopupAcitve(false);
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
      </Popup>{" "}
      {isEditSchoolPopupActive && (
        <Popup
          closeBtn
          setState={setIsEditSchoolPopupActive}
          title={`소속 학교 추가 및 삭제`}
          style={{ borderRadius: "4px" }}
        >
          <div className={style.popup}>
            <div className={style.row}>
              <Table
                type="object-array"
                data={props.schoolList}
                onSelectChange={(value) => {
                  console.log(value);
                  schoolSelectRef.current = value;
                }}
                checkFunction={(value) => {
                  console.log("schools: ", schools, " value: ", value);
                  return _.includes(
                    schools.map((schoolData: any) => schoolData.school),
                    value._id
                  );
                }}
                header={[
                  {
                    text: "선택",
                    key: "",
                    type: "checkbox",
                    width: "48px",
                    align: "center",
                  },
                  { text: "학교 Id", key: "schoolId", type: "string" },
                  { text: "학교 이름", key: "schoolName", type: "string" },
                ]}
              />
            </div>

            <div style={{ marginTop: "24px" }}>
              <Button
                type={"ghost"}
                disableOnclick
                onClick={() => {
                  setSchools([
                    ...schoolSelectRef.current.map((schoolData: any) => {
                      return {
                        school: schoolData._id,
                        schoolId: schoolData.schoolId,
                        schoolName: schoolData.schoolName,
                      };
                    }),
                  ]);
                  setIsEditSchoolPopupActive(false);
                }}
                style={{
                  borderRadius: "4px",
                  height: "32px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                }}
              >
                수정
              </Button>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}

export default Basic;
