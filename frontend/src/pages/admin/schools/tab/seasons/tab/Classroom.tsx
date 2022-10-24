import Button from "components/button/Button";
import Table from "components/table/Table";
import React from "react";

type Props = {
  seasonData: any;
};
const Classroom = (props: Props) => {
  console.log(props.seasonData.classrooms);

  return (
    <div>
        <Button
        type={"ghost"}
        styles={{
          borderRadius: "4px",
          height: "32px",margin:"24px 0",
          boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
        }}
        onClick={() => {

        }}
      >
        + 새로운 강의실 추가
      </Button>
      <Table
        data={props.seasonData.classrooms}
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
            text: "삭제",
            key: "index",
            type: "button",
            onClick: (e: any) => {
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
