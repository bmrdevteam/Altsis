/**
 * @file Seasons - Classrooms - UpdateBulkPopup
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

import React, { useRef } from "react";

import style from "style/pages/admin/schools.module.scss";

// components
import Popup from "components/popup/Popup";
import Tab from "components/tab/Tab";

import Help from "./tab/Help";
import Upload from "./tab/Upload";
import Update from "./tab/Update";

type Props = {
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  _id: string;
  setSubjects: (subjects: any) => void;
};

function Basic(props: Props) {
  const subjectsRef = useRef<{ label: string[]; data: string[][] }>({
    label: [],
    data: [],
  });

  return (
    <Popup
      setState={props.setPopupActive}
      style={{ maxWidth: "680px", width: "100%" }}
      closeBtn
      title="교과목 일괄 설정"
      contentScroll
    >
      <div className={style.popup}>
        <Tab
          dontUsePaths
          items={{
            "1. 양식 다운로드": <Help />,
            "2. 파일 업로드": <Upload subjectsRef={subjectsRef} />,
            "3. 일괄 설정": (
              <Update
                _id={props._id}
                setPopupActive={props.setPopupActive}
                subjectsRef={subjectsRef}
                setSubjects={props.setSubjects}
              />
            ),
          }}
          align={"flex-start"}
        />
      </div>
    </Popup>
  );
}

export default Basic;
