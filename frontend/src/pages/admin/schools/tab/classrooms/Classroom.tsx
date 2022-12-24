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
import Table from "components/tableV2/Table";
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

  /* popup activation */
  const [updateBulkPopup, setUpdateBulkPopupActive] = useState<boolean>(false);

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
    <>
      {" "}
      <div className={style.popup}>
        <Button
          type={"ghost"}
          onClick={() => {
            setUpdateBulkPopupActive(true);
          }}
          style={{
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            marginTop: "24px",
          }}
        >
          파일로 일괄 수정
        </Button>

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
              text: "No",
              type: "text",
              key: "tableRowIndex",
              width: "48px",
              textAlign: "center",
            },
            {
              text: "강의실",
              key: "0",
              type: "text",
            },
            {
              text: "삭제",
              key: "delete",
              type: "button",
              onClick: (e: any) => {
                props.schoolData?.classrooms.splice(e.tableRowIndex - 1, 1);
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
              textAlign: "center",
              btnStyle: {
                border: true,
                color: "red",
                padding: "4px",
                round: true,
              },
            },
          ]}
        />
      </div>{" "}
      {updateBulkPopup && (
        <UpdateBulk
          setPopupActive={setUpdateBulkPopupActive}
          schoolData={props.schoolData}
          setSchoolData={props.setSchoolData}
        />
      )}
    </>
  );
};

export default Classroom;
