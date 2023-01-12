/**
 * @file User School Bulk Page Tab Item - Basic
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
  updateUserList: any;
  selectedUserList: any[];
};

function Basic(props: Props) {
  const database = useDatabase();

  const fileInput = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>();

  const [userList, setUserList] = useState<any[]>([]);
  const [invalidUserCnt, setInvalidUserCnt] = useState<number>(-1);

  const schoolSelectRef = useRef<any[]>([]);

  async function addSchoolBulk() {
    console.log(" props.selectedUserList is ", props.selectedUserList);
    const schools = schoolSelectRef.current.map((school) => {
      return {
        school: school._id,
        schoolId: school.schoolId,
        schoolName: school.schoolName,
      };
    });

    const { users: result } = await database.U({
      location: `users/schools/bulk`,
      data: {
        type: "add",
        schools: schools,
        userIds: props.selectedUserList.map((user: any) => user._id),
      },
    });
    return result;
  }

  async function deleteSchoolBulk() {
    const schools = schoolSelectRef.current.map((school) => {
      return {
        school: school._id,
        schoolId: school.schoolId,
        schoolName: school.schoolName,
      };
    });

    const { users: result } = await database.U({
      location: `users/schools/bulk`,
      data: {
        type: "remove",
        schools: schools,
        userIds: props.selectedUserList.map((user: any) => user._id),
      },
    });
    return result;
  }

  useEffect(() => {
    console.log("invalidUserCnt: ", invalidUserCnt);
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
        title="학교 일괄 설정"
        closeBtn
        setState={props.setPopupActive}
        style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
        contentScroll
      >
        <div className={style.popup}>
          <div>
            선택된 아카데미 사용자를 학교에 등록하거나 취소할 수 있습니다.
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
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              marginTop: "24px",
            }}
          >
            <Button
              type={"ghost"}
              onClick={() => {
                if (schoolSelectRef.current.length === 0) {
                  alert("선택된 학교가 없습니다.");
                } else {
                  addSchoolBulk()
                    .then((res) => {
                      alert("success");
                      res.forEach((user: any) => {
                        props.updateUserList(user.userId, user);
                      });
                      props.setPopupActive(false);
                    })
                    .catch((err) => alert(err.response.data.message));
                }
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",

                flex: "auto",
              }}
            >
              선택된 학교에 등록
            </Button>
            <Button
              type={"ghost"}
              onClick={() => {
                if (schoolSelectRef.current.length === 0) {
                  alert("선택된 학교가 없습니다.");
                } else {
                  deleteSchoolBulk()
                    .then((res) => {
                      res.forEach((user: any) => {
                        props.updateUserList(user.userId, user);
                      });
                      props.setPopupActive(false);
                    })
                    .catch((err) => alert(err.response.data.message));
                }
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                flex: "auto",
              }}
            >
              선택된 학교에 등록 취소
            </Button>
          </div>
        </div>
      </Popup>
    </>
  );
}

export default Basic;
