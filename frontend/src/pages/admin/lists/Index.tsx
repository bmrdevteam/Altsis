import { useState } from "react";
import { useNavigate } from "react-router-dom";

import style from "style/pages/admin/list.module.scss";

// components
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Button from "components/button/Button";
import Divider from "components/divider/Divider";
import Table from "components/table/Table";
import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Navbar from "layout/navbar/Navbar";

type Props = {};

const Lists = (props: Props) => {
  const navigate = useNavigate();

  const [addDatabasePopupActive, setAddDatabasePopupActive] =
    useState<boolean>(false);
  const [addDatabaseFormValid, setAddDatabaseFormValid] =
    useState<boolean>(false);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>리스트</div>
        <div className={style.description}>
          아카데미 내에 데이터베이스를 생성하고 관리할수있습니다
        </div>
        <Divider />
        <Button
          type="ghost"
          onClick={() => {
            setAddDatabasePopupActive(true);
            setAddDatabaseFormValid(false);
          }}
        >
          데이터베이스 추가
        </Button>
        <div style={{ height: "24px" }}></div>
        <Table
          type="object-array"
          data={[
            { _id: "abwqe43cas", dbName: "DB1", data: [] },
            { _id: "abcadfas423", dbName: "DB2", data: [] },
            { _id: "abcadf12as", dbName: "버스", data: [] },
            { _id: "abcadfa2345fs", dbName: "도서관", data: [] },
          ]}
          header={[
            {
              text: "id",
              key: "",
              type: "index",
              width: "48px",
              align: "center",
            },
            {
              text: "dbname",
              key: "dbName",
              type: "string",
              align: "left",
            },
            {
              text: "자세히",
              key: "_id",
              width: "72px",
              type: "button",
              align: "center",
              onClick: (e: any) => {
                navigate(e.target.dataset.value, { replace: true });
              },
            },
          ]}
        />
        {addDatabasePopupActive && (
          <Popup
            setState={setAddDatabasePopupActive}
            title="데이터베이스 추가"
            closeBtn
            footer={
              <Button
                type="ghost"
                disabled={!addDatabaseFormValid}
                onClick={() => {
                  setAddDatabasePopupActive(false);
                }}
              >
                추가
              </Button>
            }
          >
            <Input
              appearence="flat"
              label="데이터베이스 이름"
              required
              onChange={(e: any) => {
                setAddDatabaseFormValid(!(e.target.value === ""));
              }}
            />
          </Popup>
        )}
      </div>
    </>
  );
};

export default Lists;
