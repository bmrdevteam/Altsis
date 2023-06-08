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

import { useState, useEffect } from "react";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";

import UpdateBulk from "./UpdateBulkPopup/Index";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { unflattenObject } from "functions/functions";

type Props = {
  _id: string;
};

const Classroom = (props: Props) => {
  const { SeasonAPI } = useAPIv2();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [classroomList, setClassroomList] = useState<string[]>([]);

  /* popup activation */
  const [updateBulkPopup, setUpdateBulkPopupActive] = useState<boolean>(false);

  useEffect(() => {
    if (isLoading) {
      SeasonAPI.RSeason({ params: { _id: props._id } })
        .then(({ season }) => {
          setClassroomList(season.classrooms);
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
          파일로 일괄 설정
        </Button>

        <div style={{ marginTop: "24px" }} />

        <Table
          data={!isLoading ? classroomList : []}
          type="string-array"
          onChange={(e) => {
            const classrooms = e.map((v) => {
              return unflattenObject(v)["0"].trim();
            });
            SeasonAPI.USeasonClassrooms({
              params: { _id: props._id },
              data: { classrooms },
            })
              .then(({ season }) => {
                alert(SUCCESS_MESSAGE);
                setClassroomList(season.classrooms);
              })
              .catch((err) => {
                ALERT_ERROR(err);
                setIsLoading(true);
              });
          }}
          header={[
            {
              text: "강의실",
              key: "0",
              type: "text",
            },
            {
              text: "수정",
              type: "rowEdit",
              fontSize: "12px",
              fontWeight: "600",
              textAlign: "center",
              width: "80px",
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
