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

import React, { useRef, useEffect } from "react";

import style from "style/pages/admin/schools.module.scss";

// components
import Popup from "components/popup/Popup";

import useApi from "hooks/useApi";
import Tab from "components/tab/Tab";

import Help from "./tab/Help";
import Upload from "./tab/Upload";
import SelectSchool from "./tab/SelectSchool";
import Add from "./tab/Add";
import useAPIv2 from "hooks/useAPIv2";

// functions

type Props = {
  userList: any[];
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  addUserList: (users: any[]) => void;
};

function AddBulk(props: Props) {
  const { SchoolAPI } = useAPIv2();

  const userListRef = useRef<any[]>([]);
  const invalidUserCntRef = useRef<number>(0);

  const schoolListRef = useRef<
    {
      _id: string;
      schoolId: string;
      schoolName: string;
      tableRowChecked: boolean;
    }[]
  >([]);

  useEffect(() => {
    SchoolAPI.RSchools()
      .then(({ schools }) => {
        schoolListRef.current = schools.map((school) => {
          return { ...school, tableRowChecked: false };
        });
      })
      .catch((err: any) => alert(err.response.data.message));
  }, []);

  return (
    <Popup
      setState={props.setPopupActive}
      style={{ maxWidth: "1000px", width: "100%" }}
      closeBtn
      title="사용자 일괄 생성"
      contentScroll
    >
      <div className={style.popup}>
        <Tab
          dontUsePaths
          items={{
            "1. 양식 다운로드": <Help />,
            "2. 파일 업로드": (
              <Upload
                exUserList={props.userList}
                userListRef={userListRef}
                invalidUserCntRef={invalidUserCntRef}
              />
            ),
            "3. 학교 선택": <SelectSchool schoolListRef={schoolListRef} />,
            "4. 생성": (
              <Add
                userListRef={userListRef}
                invalidUserCntRef={invalidUserCntRef}
                schoolListRef={schoolListRef}
                setPopupActive={props.setPopupActive}
                addUserList={props.addUserList}
              />
            ),
          }}
          align={"flex-start"}
        />
      </div>
    </Popup>
  );
}

export default AddBulk;
