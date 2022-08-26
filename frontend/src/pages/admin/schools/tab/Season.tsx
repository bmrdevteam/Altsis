import React from 'react'
import Button from '../../../../components/button/Button'
import Table from '../../../../components/table/Table'

type Props = {}

const Season = (props: Props) => {
  return (
    <div>
      <div style={{height:"24px"}}></div>
      <Button
        type={"ghost"}
        borderRadius={"4px"}
        height={"32px"}
        
        onClick={() => {

        }}
      >
        + 새로운 학기 추가
      </Button>
      <div style={{ marginTop: "24px" }}>
        <Table
          data={[]}
          header={[
            {
              text: "ID",
              key: "",
              type: "index",
              width: "48px",
              align: "center",
            },
            {
              text: "학교 ID",
              key: "schoolId",
              type: "string",
            },
            {
              text: "학교명",
              key: "schoolName",
              type: "string",
            },
            {
              text: "학생수",
              key: "userCount",
              type: "string",
            },
            {
              text: "자세히",
              key: "_id",
              type: "link",
              link: "/admin/schools",
              width: "80px",
              align: "center",
            },
          ]}

        />
      </div>
    </div>
  )
}

export default Season