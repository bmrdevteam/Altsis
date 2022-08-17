import { useState } from "react";
import Svg from "../../../../assets/svg/Svg";
import Button from "../../../../components/button/Button";
import Input from "../../../../components/input/Input";
import Popup from "../../../../components/popup/Popup";
import Table from "../../../../components/table/Table";
import useDatabase from "../../../../hooks/useDatabase";
import style from "../../../../style/pages/admin/schools/schools.module.scss";
type Props = {
  school: any;
};

const Classroom = (props: Props) => {
  const [addClassroomPopupActive, setAddClassRoomPopupActive] =
    useState<boolean>(false);
  const [inputClassroomName, setInputClassroomName] = useState<string>();
  const database = useDatabase();

  console.log(`${props.school._id}/classrooms`);
  
  // addclassroom function
  async function addClassroom() {
    await database.C({
      location: `${props.school._id}/classrooms`,
      data: { new: inputClassroomName },
    });
  }

  //
  return (
    <div style={{ marginTop: "24px" }}>
      <Button
        type={"ghost"}
        borderRadius={"4px"}
        height={"32px"}
        onClick={() => {
          setAddClassRoomPopupActive(true);
        }}
      >
        + 새로운 강의실 추가
      </Button>
      <div style={{ marginTop: "24px" }}></div>

      <Table
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
            key: "",
            type: "arrText",
          },
          {
            text: "자세히",
            key: "schoolId",
            type: "button",
            onClick: () => {},

            width: "80px",
            align: "center",
          },
        ]}
        style={{ backgroundColor: "#fff" }}
      />
      {addClassroomPopupActive && (
        <Popup setState={setAddClassRoomPopupActive}>
          <div className={style.popup_container}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div className={style.title}>강의실 추가</div>
              <div
                className={style.x}
                onClick={() => {
                  setAddClassRoomPopupActive(false);
                }}
              >
                <Svg type="x" width="24px" height="24px" />
              </div>
            </div>
            <div style={{ marginTop: "24px" }}>
              <Input
                label="강의실 이름"
                required
                onChange={(e: any) => {
                  setInputClassroomName(e.target.value);
                }}
              />
            </div>
            <div style={{ marginTop: "24px" }}>
              <Button
                onClick={(e: any) => {
                  e.preventDefault();
                  addClassroom().then((res) => {
                    console.log(res);
                  });
                }}
              >
                추가
              </Button>
            </div>
          </div>
        </Popup>
      )}
    </div>
  );
};

export default Classroom;
