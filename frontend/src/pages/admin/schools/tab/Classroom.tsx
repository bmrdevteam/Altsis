/**
 * @file Season Page Tab Item - Classroom
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

import { useState, useRef } from "react";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import Input from "components/input/Input";

import _ from "lodash";

type Props = {
  schoolData?: any;
  setIsLoading?: any;
};

const Classroom = (props: Props) => {
  const database = useDatabase();

  /* classroom list */
  const [classroomList, setClassroomList] = useState<string[]>(
    props.schoolData.classrooms || []
  );
  const classroomRef = useRef<string>("");

  async function updateClassrooms() {
    const result = await database.U({
      location: `schools/${props.schoolData?._id}/classrooms`,
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
            classroomRef.current = e.target.value;
          }}
          appearence={"flat"}
          onKeyDown={(e: any) => {
            if (classroomRef.current !== "" && e.key === "Enter") {
              setClassroomList([...classroomList, classroomRef.current]);
              // e.target.value = "";
              // classroomRef.current = "";
            }
          }}
          placeholder={"ex) 101호"}
        />

        <Button
          type={"ghost"}
          onClick={() => {
            setClassroomList([...classroomList, classroomRef.current]);
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
        data={classroomList || []}
        type="string-array"
        header={[
          {
            text: "강의실",
            key: "0",
            type: "text",
          },
          {
            text: "삭제",
            type: "button",
            onClick: (e: any) => {
              console.log(e);
              
              classroomList.splice(
                _.findIndex(classroomList, (x) => x === e),
                1
              );
              setClassroomList([...classroomList]);
            },
            width: "80px",
            textAlign: "center",
          },
        ]}
      />

      <Button
        type={"ghost"}
        loading
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
              props.setIsLoading(true);
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
