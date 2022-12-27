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

import UpdateBulk from "./tab/updateBulk";

import _ from "lodash";

type Props = {
  seasonData: any;
  setSelectedSeason: any;
};

const Classroom = (props: Props) => {
  const database = useDatabase();

  const [classroomList, setClassroomList] = useState<any[]>(
    props.seasonData.classrooms || []
  );
  const classroomRef = useRef<string>("");

  /* popup activation */
  const [updateBulkPopup, setUpdateBulkPopupActive] = useState<boolean>(false);

  async function updateClassrooms(classroomList: any[]) {
    const result = await database.U({
      location: `seasons/${props.seasonData._id}/classrooms`,
      data: {
        new: classroomList,
      },
    });
    return result;
  }

  return (
    <>
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
                updateClassrooms([...classroomList, classroomRef.current])
                  .then((res: any) => {
                    setClassroomList(res);
                    props.seasonData.classrooms = res;
                    props.setSelectedSeason(props.seasonData);
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
              updateClassrooms([...classroomList, classroomRef.current])
                .then((res: any) => {
                  setClassroomList(res);
                  props.seasonData.classrooms = res;
                  props.setSelectedSeason(props.seasonData);
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
          data={classroomList}
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
                classroomList.splice(e.rowIndex - 1, 1);
                updateClassrooms([...classroomList])
                  .then((res: any) => {
                    setClassroomList(res);
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
      </div>
      {updateBulkPopup && (
        <UpdateBulk
          setPopupActive={setUpdateBulkPopupActive}
          seasonData={props.seasonData}
          setClassroomList={setClassroomList}
          setSelectedSeason={props.setSelectedSeason}
        />
      )}
    </>
  );
};

export default Classroom;
