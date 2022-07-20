import React from 'react'
import Editor from '../../components/UI/editor/Editor'
import Table from '../../components/UI/table/Table'
import { TableDummy } from '../../dummyData/TableDummy.data'

type Props = {}

const TableExample = (props: Props) => {
  return (
    <div>
        <Editor/>





         {/* <Table
            data={TableDummy}
            header={[
              "id",
              "시간",
              "유저",
              "arr",
              "상태",
              "상태",
            ]}
            items={[
              "id",
              "time",
              "userId",
              "number",
              "boolean",
              "state",
            ]}
            itemTypes={[
              "index",
              "date",
              "string",
              "number",
              "select",
              "select",
            ]}
          /> */}
    </div>
  )
}

export default TableExample