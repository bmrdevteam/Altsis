/**
 * @file Mentoring teacher popup
 * @page 수업 개설/수정 뷰 - 강의계획서 지도교사 수정
 *
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
import { useEffect, useRef } from "react";
import { useAuth } from "contexts/authContext";

import style from "style/pages/courses/course.module.scss";

// components
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import _ from "lodash";
import Button from "components/button/Button";

type Props = {
  setPopupActive: any;
  selectedTeachers?: { _id: string; userId: string; userName: string }[];
  setCourseMentorList: React.Dispatch<
    React.SetStateAction<
      {
        _id: string;
        userId: string;
        userName: string;
      }[]
    >
  >;
};

const Index = (props: Props) => {
  const { currentSeason } = useAuth();

  const teacherListRef = useRef<
    {
      _id: string;
      userId: string;
      userName: string;
      tableRowChecked: boolean;
    }[]
  >([]);

  const getDefaultTeacherList = () => {
    return (
      currentSeason?.registrations
        .filter((reg) => reg.role === "teacher")
        .map((reg) => {
          return {
            _id: reg.user,
            userId: reg.userId,
            userName: reg.userName,
            tableRowChecked: props.selectedTeachers
              ? _.find(props.selectedTeachers, {
                  _id: reg.user,
                })
                ? true
                : false
              : false,
          };
        }) ?? []
    );
  };

  useEffect(() => {
    if (currentSeason) {
      teacherListRef.current = getDefaultTeacherList();
    }

    return () => {};
  }, [currentSeason]);

  return (
    <Popup
      setState={props.setPopupActive}
      title={"지도교사 선택"}
      closeBtn
      contentScroll
      style={{ width: "900px" }}
      footer={
        <Button
          type="ghost"
          onClick={() => {
            props.setCourseMentorList(
              _.filter(teacherListRef.current, {
                tableRowChecked: true,
              })
            );
            props.setPopupActive(false);
          }}
        >
          선택
        </Button>
      }
    >
      <div className={style.section}>
        <Table
          data={getDefaultTeacherList()}
          type="object-array"
          control
          onChange={(value: any[]) => {
            teacherListRef.current = value;
          }}
          header={[
            {
              text: "checkbox",
              key: "",
              type: "checkbox",
              width: "48px",
            },
            {
              text: "선생님 이름",
              key: "userName",
              type: "text",
              textAlign: "center",
            },
            {
              text: "선생님 ID",
              key: "userId",
              type: "text",
              textAlign: "center",
            },
          ]}
        />
      </div>
    </Popup>
  );
};

export default Index;
