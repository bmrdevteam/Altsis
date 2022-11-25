/**
 * @file School Page Tab Item - Classroom
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
import { useState } from "react";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Table from "components/table/Table";
import _ from "lodash";

type Props = {
  academy: any;
  schoolData: any;
};

const Classroom = (props: Props) => {
  const database = useDatabase();

  /* classroom list */
  const [classroomList, setClassroomList] = useState<string[]>(
    props.schoolData.classrooms || []
  );
  const [classroom, setClassroom] = useState<string>("");

  async function updateClassrooms() {
    const result = await database.U({
      location: `academies/${props.academy}/schools/${props.schoolData?._id}/classrooms`,
      data: {
        new: classroomList,
      },
    });
    return result;
  }

  return (
    <div className={style.popup}>
      <div className={style.title} style={{ marginTop: "24px" }}>
        classroom 추가하기
      </div>

      <div className={style.row}>
        <Input
          style={{ minHeight: "30px" }}
          onChange={(e: any) => {
            setClassroom(e.target.value);
          }}
          appearence={"flat"}
        />

        <Button
          type={"ghost"}
          onClick={() => {
            setClassroomList([...classroomList, classroom]);
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
            text: "ID",
            key: "",
            type: "index",
            width: "48px",
            align: "center",
          },
          {
            text: "classroom",
            key: "",
            type: "string",
          },
          {
            text: "삭제",
            key: "index",
            type: "button",
            onClick: (e: any) => {
              classroomList.splice(e.index, 1);
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
        수정하기
      </Button>
    </div>
  );
};

export default Classroom;
