/**
 * @file Seasons Page Tab Item - Classroom
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
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

import { useState, useEffect } from "react";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/table/Table";
import React from "react";

import _ from "lodash";
import Input from "components/input/Input";

type Props = {
  seasonData: any;
};

const Classroom = (props: Props) => {
  const database = useDatabase();

  /* classroom list */
  const [classroomList, setClassroomList] = useState<string[]>(
    props.seasonData.classrooms || []
  );
  const [classroom, setClassroom] = useState<string>("");

  async function updateClassrooms() {
    const result = await database.U({
      location: `seasons/${props.seasonData?._id}/classrooms`,
      data: {
        new: classroomList,
      },
    });
    return result;
  }

  return (
    <div className={style.popup}>
      <div className={style.title} style={{ marginTop: "24px" }}>
        강의실 추가하기
      </div>

      <div className={style.row}>
        <Input
          style={{ minHeight: "30px" }}
          onChange={(e: any) => {
            console.log(e.target);
            setClassroom(e.target.value);
          }}
          appearence={"flat"}
          placeholder="ex) 101호"
          onKeyDown={(e: any) => {
            if (classroom !== "" && e.key === "Enter") {
              setClassroomList([...classroomList, classroom]);
              e.target.value = "";
            }
          }}
        />
        <Button
          type={"ghost"}
          onClick={() => {
            if (classroom !== "") {
              setClassroomList([...classroomList, classroom]);
              // 어떻게 input을 비울 수 있지?
            }
          }}
          style={{
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
        >
          추가
        </Button>
      </div>

      <div style={{ marginTop: "24px" }} />
      <Table
        type="string-array"
        data={classroomList || []}
        header={[
          {
            text: "ID",
            key: "",
            type: "index",
            width: "48px",
            align: "center",
          },
          {
            text: "강의실",
            key: 0,
            type: "string",
          },
          {
            text: "삭제",
            key: "index",
            type: "button",
            onClick: (e: any) => {
              classroomList.splice(
                _.findIndex(classroomList, (x) => x === e),
                1
              );
              setClassroomList([...classroomList]);
            },
            width: "80px",
            align: "center",
            textStyle: {
              padding: "0 10px",
              border: "var(--border-default)",
              background: "rgba(255, 200, 200, 0.25)",
              borderColor: "rgba(255, 200, 200)",
            },
          },
        ]}
      />
      <Button
        type={"ghost"}
        style={{
          borderRadius: "4px",
          height: "32px",
          margin: "24px 0",
          boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
        }}
        onClick={() => {
          updateClassrooms()
            .then(() => {
              alert("success");
            })
            .catch((err) => {
              alert(err.response.data.message);
            });
        }}
      >
        저장
      </Button>
    </div>
  );
};

export default Classroom;
