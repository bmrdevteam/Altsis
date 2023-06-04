/**
 * @file User Add Bulk Popup Tab Item - Help
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

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Callout from "components/callout/Callout";
import Textarea from "components/textarea/Textarea";

type Props = {};

const description = `1. 양식을 다운받아 사용자 정보를 B1셀부터 입력합니다.
* 필드 순서: ID, 이름, 비밀번호, 이메일, 구글 로그인 이메일, 전화번호 \n
2. 각 필드는 다음 규칙을 따라야 합니다.
2-1. ID(필수): 알파벳, 숫자로 이루어진 길이 4~20의 문자열
2-2. 이름(필수): 알파벳, 숫자, 한글로 이루어진 길이 2~20자의 문자열
2-3. 비밀번호(필수): 특수문자(!@#$%^&*())가 하나 이상 포함된 길이 8~26의 문자열
2-4. 이메일: 이메일 형식 ex) google@gmail.com
2-5. 전화번호: 전화번호 형식 ex) 010-0000-0000
3. ID는 고유한 값으로, 중복이 허용되지 않습니다.
4. ID와 이름은 추후 수정될 수 없습니다.
5. 구글 로그인 이메일은 고유한 값으로, 중복이 허용되지 않습니다.`;

const exampleDownload = () => {
  const ws = xlsx.utils.json_to_sheet([
    {
      ID: "user01",
      이름: "홍길동",
      비밀번호: "asdfqwer!@#$",
      이메일: "google@email.com",
      "구글 로그인 이메일": "google@gmail.com",
      전화번호: "010-0000-1111",
    },
  ]);
  const wb = xlsx.utils.book_new();

  xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
  xlsx.writeFile(wb, `example.xlsx`);
};

function Help(props: Props) {
  return (
    <div className={style.popup}>
      <div style={{ marginTop: "24px" }}>
        <Callout
          type="info"
          title="도움말"
          showIcon
          child={
            <Textarea
              defaultValue={description}
              rows={13}
              style={{
                backgroundColor: "rgba(0, 0, 0, 0)",
                margin: "0px",
                padding: "0px",
              }}
              disabled
            />
          }
        />
      </div>
      <div>
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
          }}
        >
          양식 다운로드
        </Button>
      </div>
    </div>
  );
}

export default Help;
