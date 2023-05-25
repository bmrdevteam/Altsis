import Button from "components/button/Button";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";
import Table from "components/table/Table";
import React, { useState } from "react";

type Props = {};

const Header = (props: Props) => {
  const [headerData, setHeaderData] = useState<any[]>();
  const [addHeaderData, setAddHeaderData] = useState<boolean>();

  return (
    <div style={{ marginTop: "24px" }}>
      <Button
        type="ghost"
        onClick={() => {
          setAddHeaderData(true);
        }}
      >
        추가
      </Button>
      <div style={{ marginTop: "24px" }}>
        <Table
          type="object-array"
          data={headerData}
          header={[
            {
              key: "",
              text: "id",
              type: "index",
              width: "48px",
              align: "center",
            },
            { key: "", text: "데이터 타입", type: "select" },
          ]}
        />
      </div>
      {addHeaderData && (
        <Popup
          setState={setAddHeaderData}
          title="추가"
          closeBtn
          footer={
            <Button
              type="ghost"
              onClick={() => {
                setAddHeaderData(true);
              }}
            >
              추가
            </Button>
          }
        >
          <div>
            <Input appearence="flat" label="데이터 이름" required />
          </div>
        </Popup>
      )}
    </div>
  );
};

export default Header;
