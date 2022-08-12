import React from "react";
import NavigationLinks from "../../../../components/navigationLinks/NavigationLinks";
import Table from "../../../../components/table/Table";
import style from "../../../../style/pages/academy/schools/schools.module.scss";
type Props = {};

const Classroom = (props: Props) => {
  return (
    <div style={{ marginTop: "24px" }}>
      <Table
        data={[
          {
            id: "j23htjnasdbd34",
            classroom: "202호",
          },
          {
            id: "2135ljh312bdas",
            classroom: "102호",
          },
        ]}
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
            key: "classroom",
            type: "string",
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

export default Classroom;
