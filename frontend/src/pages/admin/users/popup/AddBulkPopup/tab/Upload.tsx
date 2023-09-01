/**
 * @file User Add Bulk Popup Tab Item - Upload
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
import * as xlsx from "xlsx";
import _ from "lodash";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";

import { validate } from "functions/functions";
import Loading from "components/loading/Loading";

// functions

type Props = {
  exUserList: any[];
  userListRef: React.MutableRefObject<any[]>;
  invalidUserCntRef: React.MutableRefObject<number>;
};

const fieldToTextMap = new Map<string, string>([
  ["userId", "ID"],
  ["userName", "이름"],
  ["password", "비밀번호"],
  ["email", "이메일"],
  ["tel", "전화번호"],
  ["googleLoginEmail", "구글 로그인 이메일"],
]);

const textToFieldMap = new Map<string, string>();
for (let field of Array.from(fieldToTextMap.keys())) {
  textToFieldMap.set(fieldToTextMap.get(field) ?? "", field);
}

function Upload(props: Props) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>();

  const [refresh, setRefresh] = useState<boolean>(false);

  const handleFileUploadButtonClick = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (fileInput.current) fileInput.current.click();
  };

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

      /* parse userList */
      const newUserList: any[] = [];
      for (let _user of res) {
        newUserList.push({
          userId: _user["ID"],
          userName: _user["이름"],
          password: _user["비밀번호"],
          email: _user["이메일"] !== "" ? _user["이메일"] : undefined,
          tel: _user["전화번호"] !== "" ? _user["전화번호"] : undefined,
          snsId: {
            google:
              _user["구글 로그인 이메일"] !== ""
                ? _user["구글 로그인 이메일"]
                : undefined,
          },
        });
      }

      /* validate userList */
      const exUserIds = props.exUserList.map((exUser) => exUser.userId);
      const exGoogleLoginEmails = props.exUserList
        .map((exUser) => exUser.snsId?.google)
        .filter((val) => val);

      let invalidUserCnt = 0;
      for (let user of newUserList) {
        let invalidFields: string[] = [];

        // validate userId, userName, password
        for (let field of ["userId", "userName", "password"]) {
          if (!user[field]) {
            invalidFields.push(field);
          } else if (!validate(field, user[field])) {
            invalidFields.push(field);
          }
        }

        // validate email, tel
        for (let field of ["email", "tel"]) {
          if (user[field] && !validate(field, user[field])) {
            invalidFields.push(field);
          }
        }

        // validate googleLoginEmail
        if (user.snsId.google && !validate("email", user.snsId.google)) {
          invalidFields.push("googleLoginEmail");
        }

        /* check duplication */
        if (_.find(exUserIds, (exUserId) => exUserId === user.userId)) {
          invalidFields.push("ID 중복");
        } else {
          exUserIds.push(user.userId);
        }

        if (user.snsId.google) {
          if (
            _.find(
              exGoogleLoginEmails,
              (exGoogleLoginEmail) => exGoogleLoginEmail === user.snsId.google
            )
          ) {
            invalidFields.push("구글 로그인 이메일 중복");
          } else {
            exGoogleLoginEmails.push(user.snsId.google);
          }
        }

        if (invalidFields.length !== 0) {
          user.isValid = _.join(
            invalidFields.map((field) => fieldToTextMap.get(field) ?? field),
            ", "
          );
          invalidUserCnt += 1;
        }
      }

      props.userListRef.current = newUserList;
      props.invalidUserCntRef.current = invalidUserCnt;
      setRefresh(true);
    };

    reader.readAsBinaryString(file);
  };

  useEffect(() => {
    if (selectedFile) {
      fileToUserList(selectedFile);
    }
  }, [selectedFile]);

  useEffect(() => {
    if (refresh) {
      setTimeout(() => {
        setRefresh(false);
      }, 500);
    }
  }, [refresh]);

  return !refresh ? (
    <div className={style.popup}>
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
            onClick={handleFileUploadButtonClick}
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
            {selectedFile
              ? `${selectedFile.name} / ${
                  props.invalidUserCntRef.current === 0
                    ? "유효성 검사 통과"
                    : `수정이 필요한 항목이 ${props.invalidUserCntRef.current}개 있습니다.`
                }`
              : "선택된 파일이 없습니다."}
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

      <div style={{ marginTop: "24px" }}>
        <Table
          type="object-array"
          data={props.userListRef.current}
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
              text: "구글 로그인 이메일",
              key: "snsId.google",
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
              text: "유효성",
              key: "isValid",
              width: "120px",
              textAlign: "center",
              type: "text",
            },
          ]}
        />
      </div>
    </div>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
}

export default Upload;
