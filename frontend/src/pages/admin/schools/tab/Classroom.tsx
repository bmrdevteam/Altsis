/**
 * @file Schools Pid Page Tab Item - Classroom
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

import { useState } from "react";
import Button from "components/button/Button";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";
import Table from "components/table/Table";
import useDatabase from "hooks/useDatabase";
import useGenerateId from "hooks/useGenerateId";
type Props = {
  school: any;
  resetData: any;
};

const Classroom = (props: Props) => {
  const database = useDatabase();
  const generateId = useGenerateId;
  const [addClassroomPopupActive, setAddClassRoomPopupActive] =
    useState<boolean>(false);
  const [deleteClassroomPopupActive, setDeleteClassRoomPopupActive] =
    useState<boolean>(false);
  const [inputClassroomName, setInputClassroomName] = useState<string>();
  const [deleteClassroomIndex, setDeleteClassroomIndex] = useState<number>();

  // addclassroom function
  async function addClassroom() {
    if (addClassroomPopupActive && inputClassroomName !== undefined) {
      console.log(inputClassroomName);

      await database.C({
        location: `schools/${props.school?._id}/classrooms`,
        data: { new: inputClassroomName },
      });
      props.resetData(true);
    }
    setAddClassRoomPopupActive(false);
  }
  async function deleteClassroom(index: number | undefined) {
    if (typeof index === "number" && deleteClassroomPopupActive) {
      await database.D({
        location: `schools/${props.school?._id}/classrooms/${index}`,
      });
      props.resetData(true);
    }
    setDeleteClassRoomPopupActive(false);
  }
  //
  return (
    <div style={{ marginTop: "24px" }}>
      <Button
        type={"ghost"}
        style={{
          borderRadius: "4px",
          height: "32px",
          boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
        }}
        onClick={() => {
          setAddClassRoomPopupActive(true);
        }}
      >
        + 새로운 강의실 추가
      </Button>
      <div style={{ marginTop: "24px" }}></div>

      <Table
        type="string-array"
        data={props.school?.classrooms}
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
            onClick: (value: any) => {
              setDeleteClassroomIndex(parseInt(value.rowindex));
              setDeleteClassRoomPopupActive(true);
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
      {addClassroomPopupActive && (
        <Popup setState={setAddClassRoomPopupActive} title="강의실 추가">
          <div style={{ marginTop: "24px" }}>
            <Input
              label="강의실 이름"
              required
              onChange={(e: any) => {
                setInputClassroomName(e.target.value);
              }}
              onKeyDown={(e: any) => {
                if (e.key === "Enter") {
                  addClassroom();
                }
              }}
            />
          </div>
          <div style={{ marginTop: "24px" }}>
            <Button
              disableOnclick
              onClick={(e: any) => {
                addClassroom();
              }}
            >
              추가
            </Button>
          </div>
        </Popup>
      )}
      {deleteClassroomPopupActive && (
        <Popup setState={setDeleteClassRoomPopupActive} title="강의실 삭제">
          <div style={{ marginTop: "24px" }}>
            <strong>강의실 :</strong>
            &nbsp;
            {props.school?.classrooms[deleteClassroomIndex as number]}
          </div>
          <div style={{ marginTop: "24px" }}>
            <Button
              onClick={(e: any) => {
                deleteClassroom(deleteClassroomIndex);
                setDeleteClassroomIndex(undefined);
              }}
              disableOnclick
            >
              삭제
            </Button>
          </div>
        </Popup>
      )}
    </div>
  );
};

export default Classroom;
