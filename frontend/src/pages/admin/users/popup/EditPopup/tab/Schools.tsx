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

import { useState, useRef, useEffect } from "react";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Select from "components/select/Select";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";
import _ from "lodash";
import Textarea from "components/textarea/Textarea";

type Props = {
  user: any;
  setUser: React.Dispatch<any>;
  updateUserList: (userId: string, userData: any) => void;
};

function Basic(props: Props) {
  const database = useDatabase();
  const schoolSelectRef = useRef<any[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  /* document fields */
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [schools, setSchools] = useState<any[]>();
  const [schoolsText, setSchoolsText] = useState<string>("");
  const [auth, setAuth] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [google, setGoogle] = useState<string>("");
  const [tel, setTel] = useState<string>("");

  /* Popup Activation */
  const [isEditSchoolPopupActive, setIsEditSchoolPopupActive] =
    useState<boolean>(false);

  async function updateUser() {
    const result = database.U({
      location: `users/${props.user}`,
      data: {
        schools,
        auth,
        tel: tel && tel !== "" ? tel : undefined,
        email: email && email !== "" ? email : undefined,
        snsId: { google: google && google !== "" ? google : undefined },
      },
    });
    return result;
  }

  async function getUser() {
    const res = await database.R({
      location: `users/${props.user}`,
    });
    return res;
  }

  useEffect(() => {
    // console.log("auth is ", auth);
  }, [auth]);

  useEffect(() => {
    if (isLoading) {
      getUser()
        .then((res: any) => {
          setUserId(res.userId);
          setUserName(res.userName);
          setSchools(res.schools);
          setAuth(res.auth);
          setEmail(res.email);
          setTel(res.tel);
          setGoogle(res.snsId?.google);
        })
        .then(() => setIsLoading(false))
        .catch((err: any) => alert(err.response.data.message));
    }
  }, [isLoading]);

  useEffect(() => {
    if (schools) {
      setSchoolsText(
        schools.length !== 0
          ? _.join(
              schools.map((schoolData: any) => schoolData.schoolName),
              "\n"
            )
          : "*가입된 학교 없음"
      );
    }
  }, [schools]);

  return (
    <>
      <div className={style.popup}>
        <div style={{ marginTop: "24px" }} />
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
            rows={schools?.length || 1}
            style={{ resize: "none" }}
          />
          <Button
            type={"ghost"}
            onClick={() => {
              // console.log(schools);
              schoolSelectRef.current = schools ? schools : [];
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
      </div>
      {isEditSchoolPopupActive && (
        <Popup
          closeBtn
          setState={setIsEditSchoolPopupActive}
          title={`소속 학교 추가 및 삭제`}
        >
          <div className={style.popup}>
            <div className={style.row}>
              <Table
                type="object-array"
                data={
                  props.user.schoolList?.map((school: any) => {
                    // console.log(schoolSelectRef.current);
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
                }}
                header={[
                  {
                    text: "선택",
                    key: "",
                    type: "checkbox",
                    width: "48px",
                  },
                  { text: "학교 ID", key: "schoolId", type: "text" },
                  { text: "학교 이름", key: "schoolName", type: "text" },
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