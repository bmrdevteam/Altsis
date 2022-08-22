import React, { useEffect, useState } from "react";
import Button from "../../../../components/button/Button";
import Table from "../../../../components/table/Table";

type Props = {
  school: any;
};

const Subject = (props: Props) => {
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    props.school.data.map(() => {});

    return () => {};
  }, []);

  return (
    <div style={{ marginTop: "24px" }}>
      <Button
        type={"ghost"}
        borderRadius={"4px"}
        height={"32px"}
        onClick={() => {}}
      >
        + 새로운 강의실 추가
      </Button>
      <div style={{ marginTop: "24px" }}></div>

      <Table
        data={props.school?.subject}
        header={[
          {
            text: "ID",
            key: "",
            type: "index",
            width: "48px",
            align: "center",
          },
          {
            text: "교과목",
            key: "",
            type: "arrText",
          },
          {
            text: "자세히",
            key: "schoolId",
            type: "link",
            link: "/academy/schools",
            width: "80px",
            align: "center",
          },
        ]}
        style={{ backgroundColor: "#fff" }}
      />
    </div>
  );
};

export default Subject;
