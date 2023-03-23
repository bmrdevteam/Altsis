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
import Table from "components/tableV2/Table";
import Textarea from "components/textarea/Textarea";

type Props = {
  schoolList: any;
  setPopupAcitve: any;
  addUserList: any;
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

  const [selectedSchoolList, setSelectedSchoolList] = useState<any[]>([]);
  const [schoolsText, setSchoolsText] = useState<string>("");
  const schoolSelectRef = useRef<any[]>([]);

  /* Popup Activation */
  const [isEditSchoolPopupActive, setIsEditSchoolPopupActive] =
    useState<boolean>(false);

  useEffect(() => {
    setSchoolsText(
      selectedSchoolList.length !== 0
        ? _.join(
            selectedSchoolList.map((schoolData: any) => schoolData.schoolName),
            "\n"
          )
        : "*가입된 학교 없음"
    );
  }, [selectedSchoolList]);

  async function addDocument() {
    const result = await database.C({
      location: `users`,
      data: {
        schools: selectedSchoolList,
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
      <Popup
        setState={props.setPopupAcitve}
        style={{ borderRadius: "8px", maxWidth: "600px", width: "100%" }}
        closeBtn
        title="사용자 생성"
        contentScroll
      >
        <div className={style.popup}>
          <div className={style.label} style={{ marginBottom: "0px" }}>
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
              defaultValue={schoolsText}
              disabled
              rows={selectedSchoolList.length || 1}
              style={{ resize: "none" }}
            />
            <Button
              type={"ghost"}
              onClick={() => {
                schoolSelectRef.current = selectedSchoolList;
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
              label="등급"
              required
              options={[
                { text: "멤버", value: "member" },
                { text: "매니저", value: "manager" },
              ]}
              setValue={setAuth}
              appearence={"flat"}
            />
          </div>

          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Input
              key="userId"
              appearence="flat"
              label="ID"
              required={true}
              onChange={(e: any) => {
                setUserId(e.target.value);
              }}
            />
            <Input
              appearence="flat"
              label="이름"
              required={true}
              onChange={(e: any) => {
                setUserName(e.target.value);
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Input
              appearence="flat"
              label="비밀번호"
              required={true}
              onChange={(e: any) => {
                setPassword(e.target.value);
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
                .then((res) => {
                  alert("성공적으로 처리되었습니다. 😘💌");
                  props.addUserList([res]);
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
      </Popup>
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
                data={
                  props.schoolList?.map((school: any) => {
                    if (_.find(schoolSelectRef.current, { school: school._id }))
                      school.tableRowChecked = true;
                    else school.tableRowChecked = false;
                    return school;
                  }) || []
                }
                onChange={(value: any[]) => {
                  schoolSelectRef.current = _.filter(value, {
                    tableRowChecked: true,
                  });
                  // console.log(schoolSelectRef.current);
                }}
                header={[
                  {
                    text: "선택",
                    key: "",
                    type: "checkbox",
                    width: "48px",
                  },
                  {
                    text: "학교 ID",
                    key: "schoolId",
                    type: "text",
                    textAlign: "center",
                  },
                  {
                    text: "학교 이름",
                    key: "schoolName",
                    type: "text",
                    textAlign: "center",
                  },
                ]}
              />
            </div>

            <div style={{ marginTop: "24px" }}>
              <Button
                type={"ghost"}
                disableOnclick
                onClick={() => {
                  setSelectedSchoolList(
                    schoolSelectRef.current.map((schoolData: any) => {
                      return {
                        school: schoolData._id,
                        schoolId: schoolData.schoolId,
                        schoolName: schoolData.schoolName,
                      };
                    })
                  );
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
