import Table from "components/tableV2/Table";
import { useState } from "react";

type Props = {};

const E = (props: Props) => {
  const [registrations] = useState<any>([]);

  return (
    <div style={{ padding: "24px" }}>
      <Table
        type="object-array"
        data={registrations ?? []}
        control
        defaultPageBy={10}
        onChange={(e) => {
          // console.log(e);
        }}
        header={[
          {
            text: "",
            type: "checkbox",
            width: "24px",
          },
          {
            text: "유져 아이디",
            type: "input",
            key: "userId",
          },
          {
            text: "역할",
            type: "status",
            width: "120px",
            textAlign: "center",
            fontSize: "12px",
            fontWeight: "600",
            key: "role",
            status: {
              student: {
                color: "red",
                text: "학생",
              },
              teacher: {
                color: "#0047AB",
                text: "선생님",
              },
            },
          },
          {
            text: "BTN",
            type: "button",
            width: "72px",
            textAlign: "center",
            fontSize: "12px",
            btnStyle: {
              round: false,
              border: true,
              padding: "4px",
              color: "green",
              background: "#ECFFDC",
            },
            fontWeight: "600",
          },
          {
            text: "버튼",
            type: "button",
            width: "72px",
            textAlign: "center",
            fontSize: "12px",
            btnStyle: {
              round: true,
              border: true,
              padding: "4px",
              color: "orange",
              background: "#FFF2E6",
            },
            fontWeight: "600",
          },
        ]}
      />
    </div>
  );
};

export default E;
