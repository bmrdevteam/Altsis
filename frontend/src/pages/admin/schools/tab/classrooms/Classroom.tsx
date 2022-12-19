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

import { useState, useEffect, useRef } from "react";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/table/Table";
import Input from "components/input/Input";

import UpdateBulk from "./tab/updateBulk";

import _ from "lodash";

type Props = {
  schoolData?: any;
  setSchoolData: any;
};

const Classroom = (props: Props) => {
  const database = useDatabase();

  const classroomRef = useRef<string>("");

  async function updateClassrooms(classroomList: any[]) {
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
              updateClassrooms([
                ...props.schoolData?.classrooms,
                classroomRef.current,
              ])
                .then((res: any) => {
                  props.setSchoolData({
                    ...props.schoolData,
                    classrooms: res.data,
                  });
                  alert("success");
                })
                .catch((err) => {
                  alert(err.response.data.message);
                });
            }
          }}
          placeholder={"ex) 101호"}
        />

        <Button
          type={"ghost"}
          onClick={() => {
            updateClassrooms([
              ...props.schoolData?.classrooms,
              classroomRef.current,
            ])
              .then((res: any) => {
                props.setSchoolData({
                  ...props.schoolData,
                  classrooms: res.data,
                });
                alert("success");
              })
              .catch((err) => {
                alert(err.response.data.message);
              });
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
        data={props.schoolData?.classrooms}
        type="string-array"
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
              props.schoolData?.classrooms.splice(
                _.findIndex(props.schoolData?.classrooms, (x) => x === e),
                1
              );
              updateClassrooms([...props.schoolData?.classrooms])
                .then((res: any) => {
                  props.setSchoolData({
                    ...props.schoolData,
                    classrooms: res.data,
                  });
                  alert("success");
                })
                .catch((err) => {
                  alert(err.response.data.message);
                });
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
    </div>
  );
};

export default Classroom;
