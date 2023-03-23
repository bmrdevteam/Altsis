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

import React, { useState, useRef, useEffect } from "react";
import useDatabase from "hooks/useDatabase";
import * as xlsx from "xlsx";
import _ from "lodash";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import { validate } from "functions/functions";

// functions

type Props = {
  schoolList: any;
  setPopupActive: any;
  addUserList: any;
};

function Basic(props: Props) {
  const database = useDatabase();

  const fileInput = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>();

  const [userList, setUserList] = useState<any[]>([]);
  const [invalidUserCnt, setInvalidUserCnt] = useState<number>(-1);

  const schoolSelectRef = useRef<any[]>();

  // popup activation
  const [isHelpPopupActive, setIsHelpPopupActive] = useState<boolean>(false);
  const [isAddPopupActive, setIsAddPopupActive] = useState<boolean>(false);

  const description = `1. 엑셀을 열어 사용자 정보를 B1셀부터 입력합니다.  \n
 * 필드 순서: ID, 이름, 비밀번호, 이메일, 전화번호 \n
2. 각 필드는 다음 규칙을 따라야 합니다.  \n
 2-1. ID(필수): 알파벳, 숫자로 이루어진 길이 4~20의 문자열  \n
 2-2. 이름(필수): 길이 2~20자의 문자열 \n
 2-3. 비밀번호(필수): 특수문자(!@#$%^&*())가 하나 이상 포함된 길이 8~26의 문자열 \n
 2-4. 이메일: 이메일 형식 ex) google@gmail.com \n
 2-5. 전화번호: 규칙 없음 \n
3. ID는 고유한 값으로, 중복이 허용되지 않습니다. \n
4. ID와 이름은 추후 수정될 수 없습니다.`;

  async function addUserBulk() {
    // console.log("schoolSelectRef.current: ", schoolSelectRef.current);
    const schools = schoolSelectRef.current?.map((school) => {
      return {
        school: school._id,
        schoolId: school.schoolId,
        schoolName: school.schoolName,
      };
    });

    const { users: result } = await database.C({
      location: `users/bulk`,
      data: {
        users: userList.map((user) => {
          return { ...user, schools };
        }),
      },
    });
    return result;
  }

  useEffect(() => {
    // console.log("invalidUserCnt: ", invalidUserCnt);
  }, [invalidUserCnt]);
  const fileToUserList = (file: any) => {
    var reader = new FileReader();

    reader.onload = function () {
      const res: any[] = [];
      var fileData = reader.result;
      var wb = xlsx.read(fileData, { type: "binary" });
      wb.SheetNames.forEach(function (sheetName) {
        var rowObjList = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
        res.push(...rowObjList);
      });
      setInvalidUserCnt(-1);
      setUserList(
        res.map((user: any) => {
          return {
            userId: user["ID"],
            userName: user["이름"],
            password: user["비밀번호"],
            email: user["이메일"],
            tel: user["전화번호"],
            isValid: "검사 필요",
          };
        })
      );
    };

    reader.readAsBinaryString(file);
  };

  async function getExUsers() {
    const { users } = await database.R({
      location: `users?fields=userId`,
    });
    return users;
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files?.length === 0) return;
    if (
      e.target.files[0].type !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      alert("지원되지 않는 파일 형식입니다.");
      return;
    }
    setSelectedFile(e.target.files[0]);
  };

  useEffect(() => {
    if (selectedFile) {
      fileToUserList(selectedFile);
    }
  }, [selectedFile]);

  const handleProfileUploadButtonClick = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (fileInput.current) fileInput.current.click();
  };

  const exampleDownload = () => {
    const ws = xlsx.utils.json_to_sheet([
      {
        ID: "user01",
        이름: "홍길동",
        비밀번호: "asdfqwer!@#$",
        이메일: "google@email.com",
        전화번호: "010-0000-1111",
      },
    ]);
    const wb = xlsx.utils.book_new();

    xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
    xlsx.writeFile(wb, `example.xlsx`);
  };
  async function checkUserList() {
    let cnt = 0;

    const exUsers = await getExUsers();
    const pickedCurUserIds = _(userList)
      .groupBy((x) => x.userId)
      .pickBy((x) => x.length > 1)
      .keys()
      .value();
    const duplicatdedUserIds = [
      ...exUsers.map((user: any) => user.userId),
      pickedCurUserIds,
    ];

    const res: any[] = [];
    for (let user of userList) {
      user.isValid = [];
      if (_.includes(duplicatdedUserIds, user.userId)) {
        user.isValid.push("Id 중복");
      }
      if (!validate("userId", user.userId)) {
        user.isValid.push("Id");
      }
      if (!validate("userName", user.userName)) {
        user.isValid.push("이름");
      }
      if (!validate("password", user.password)) {
        user.isValid.push("비밀번호");
      }
      if (user.email && !validate("email", user.email)) {
        user.isValid.push("이메일");
      }

      if (_.isEmpty(user.isValid)) {
        user.isValid = undefined;
      } else {
        user.isValid = _.join(user.isValid, ", ");
        cnt += 1;
      }

      res.push(user);
    }

    setInvalidUserCnt(cnt);
    setUserList(res);
    return;
  }

  return (
    <>
      <Popup
        setState={props.setPopupActive}
        style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
        closeBtn
        title="사용자 일괄 생성"
        contentScroll
        footer={
          <Button
            type={"ghost"}
            onClick={() => {
              if (!selectedFile) {
                alert("파일을 선택해주세요.");
              } else if (invalidUserCnt === -1) {
                alert("검사를 실행해주세요");
              } else if (invalidUserCnt > 0) {
                alert(`수정이 필요한 항목이 ${invalidUserCnt}개 있습니다.`);
              } else {
                setIsAddPopupActive(true);
              }
            }}
            style={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            }}
          >
            생성
          </Button>
        }
      >
        <div className={style.popup}>
          <div style={{ display: "flex", gap: "24px" }}>
            <Button
              type={"ghost"}
              onClick={() => {
                setIsHelpPopupActive(true);
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                width: "120px",
              }}
            >
              도움말 열기
            </Button>
          </div>

          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <React.Fragment>
              <Button
                type={"ghost"}
                style={{
                  borderRadius: "4px",
                  height: "32px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                  width: "120px",
                }}
                onClick={handleProfileUploadButtonClick}
              >
                {selectedFile ? "파일 변경" : "파일 선택"}
              </Button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: "gray",
                }}
              >
                {selectedFile ? selectedFile.name : "선택된 파일이 없습니다."}
              </div>

              <input
                type="file"
                ref={fileInput}
                style={{ display: "none" }}
                onChange={(e: any) => {
                  handleFileChange(e);
                  e.target.value = "";
                }}
              />
            </React.Fragment>
          </div>
          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Button
              type={"ghost"}
              onClick={() => {
                if (!selectedFile) {
                  alert("파일을 선택해주세요");
                } else {
                  checkUserList()
                    .then((res) => {
                      // console.log();
                    })
                    .catch((err) => {
                      // console.log(err);
                      alert(err.response.data.message);
                    });
                }
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                width: "120px",
              }}
            >
              검사
            </Button>
            <div
              style={{ display: "flex", alignItems: "center", color: "gray" }}
            >
              {invalidUserCnt !== -1
                ? invalidUserCnt === 0
                  ? "유효성 검사 통과"
                  : `수정이 필요한 항목이 ${invalidUserCnt}개 있습니다.`
                : "아직 검사가 실행되지 않았습니다."}
            </div>
          </div>

          <div style={{ marginTop: "24px" }}>
            <Table
              type="object-array"
              data={userList}
              header={[
                {
                  text: "No",
                  type: "text",
                  key: "tableRowIndex",
                  width: "48px",
                  textAlign: "center",
                },

                {
                  text: "ID",
                  key: "userId",
                  type: "text",
                  textAlign: "center",
                },
                {
                  text: "이름",
                  key: "userName",
                  type: "text",
                  textAlign: "center",
                },
                {
                  text: "비밀번호",
                  key: "password",
                  type: "text",
                  textAlign: "center",
                },
                {
                  text: "이메일",
                  key: "email",
                  type: "text",
                  textAlign: "center",
                },
                {
                  text: "전화번호",
                  key: "tel",
                  type: "text",
                  textAlign: "center",
                },

                {
                  text: "유효성 검사",
                  key: "isValid",
                  width: "120px",
                  textAlign: "center",
                  type: "text",
                },
              ]}
            />
          </div>
        </div>
      </Popup>
      {isHelpPopupActive && (
        <Popup
          title="도움말"
          closeBtn
          setState={setIsHelpPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
        >
          <div className={style.popup}>
            <div
              style={{
                whiteSpace: "pre-wrap",
              }}
            >
              {description}
            </div>

            <Button
              type={"ghost"}
              onClick={() => {
                exampleDownload();
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                marginTop: "24px",
                width: "120px",
              }}
            >
              양식 다운로드
            </Button>
          </div>
        </Popup>
      )}
      {isAddPopupActive && (
        <Popup
          title="생성"
          closeBtn
          setState={setIsAddPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
        >
          <div className={style.popup}>
            <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
              아카데미 사용자를 학교에 등록할 수 있습니다.
            </div>
            <div style={{ marginTop: "24px" }}>
              <Table
                type="object-array"
                data={props.schoolList}
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

                  { text: "학교 Id", key: "schoolId", type: "text" },
                  { text: "학교 이름", key: "schoolName", type: "text" },
                ]}
              />
            </div>

            <Button
              type={"ghost"}
              onClick={() => {
                addUserBulk()
                  .then((res) => {
                    // console.log(res);
                    alert("성공적으로 처리되었습니다. 😘💌");
                    props.addUserList(res);
                    props.setPopupActive(false);
                  })
                  .catch((err) => alert(err.response.data.message));
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                marginTop: "24px",
              }}
            >
              사용자 생성
            </Button>
          </div>
        </Popup>
      )}
    </>
  );
}

export default Basic;
