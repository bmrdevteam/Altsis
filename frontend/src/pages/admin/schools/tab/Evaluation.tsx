import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";
import React, { useRef, useState } from "react";

type Props = {
  schoolData: any;
};

function Evaluation({}: Props) {
  const { SeasonApi, SchoolApi } = useApi();
  const { currentSchool } = useAuth();
  const data = useRef<any>();
  return (
    <div style={{ marginTop: "24px" }}>
      <Button
        type={"ghost"}
        style={{
          marginBottom: "24px",
        }}
        onClick={() => {
          console.log(data.current);
        }}
      >
        저장
      </Button>
      <Table
        type="object-array"
        data={currentSchool.formEvaluation ?? []}
        onChange={(e) => {
          data.current = e;
        }}
        header={[
          {
            type: "text",
            text: "평가 항목",
            key: "label",
          },
          {
            text: "유형",
            key: "type",
            fontSize: "12px",
            fontWeight: "600",
            type: "status",
            status: {
              input: {
                text: "텍스트",
                color: "#B33F00",
              },
              "input-number": {
                text: "숫자",
                color: "#00B3AD",
              },
            },
            width: "80px",
            textAlign: "center",
          },
          {
            text: "평가자",
            key: "auth",
            fontSize: "12px",
            fontWeight: "600",
            type: "status",
            status: {
              teacher: {
                text: "선생님",
                color: "red",
              },
              student: {
                text: "학생",
                color: "blue",
              },
            },
            width: "80px",
            textAlign: "center",
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
  );
}

export default Evaluation;
