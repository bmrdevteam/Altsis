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

import { useState, useRef, useEffect } from "react";
import useApi from "hooks/useApi";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import Input from "components/input/Input";

import UpdateBulk from "./tab/updateBulk";

type Props = {
  _id: string;
};

const Classroom = (props: Props) => {
  const { SeasonApi } = useApi();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [classroomList, setClassroomList] = useState<any[]>([]);
  const classroomRef = useRef<string>("");

  /* popup activation */
  const [updateBulkPopup, setUpdateBulkPopupActive] = useState<boolean>(false);

  useEffect(() => {
    if (isLoading) {
      SeasonApi.RSeason(props._id)
        .then((res) => {
          setClassroomList(res.classrooms);
        })
        .then(() => setIsLoading(false));
    }
    return () => {};
  }, [isLoading]);

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
                SeasonApi.USeasonClassroom({
                  _id: props._id,
                  data: [...classroomList, classroomRef.current],
                })
                  .then((res: any) => {
                    alert("success");
                    setClassroomList(res.classrooms);
                  })
                  .catch((err) => {
                    console.log(err.response.data.message);
                    // alert(err.response.data.message);
                  });
              }
            }}
            placeholder={"ex) 101호"}
          />

          <Button
            type={"ghost"}
            onClick={() => {
              if (classroomRef.current !== "") {
                SeasonApi.USeasonClassroom({
                  _id: props._id,
                  data: [...classroomList, classroomRef.current],
                })
                  .then((res: any) => {
                    alert("success");
                    setClassroomList(res.classrooms);
                  })
                  .catch((err) => {
                    console.log(err.response.data.message);
                    // alert(err.response.data.message);
                  });
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
          data={!isLoading ? classroomList : []}
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
                classroomList.splice(e.tableRowIndex - 1, 1);
                SeasonApi.USeasonClassroom({
                  _id: props._id,
                  data: classroomList,
                })
                  .then((res: any) => {
                    alert("success");
                    setClassroomList(res.classrooms);
                  })
                  .catch((err) => {
                    console.log(err.response.data.message);
                    // alert(err.response.data.message);
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
          _id={props._id}
          setPopupActive={setUpdateBulkPopupActive}
          setClassroomList={setClassroomList}
        />
      )}
    </>
  );
};

export default Classroom;
