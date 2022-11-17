import { archiveTestData } from "archiveTest";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Table from "components/table/Table";
import React, { useState } from "react";

type Props = {};

function Archive({}: Props) {
  const [editArchivePopupActive, setEditArchivePopupActive] =
    useState<boolean>(false);
  const [editArchivefield, setEditArchivefield] = useState<string>();

  return (
    <>
      <div style={{ marginTop: "24px" }}>
        <Button
          type={"ghost"}
          style={{
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
        >
          + 새로운 아카이브 추가
        </Button>
        <div style={{ marginTop: "24px" }}></div>

        <Table
          filter
          filterSearch
          data={archiveTestData}
          header={[
            {
              text: "ID",
              key: "",
              type: "index",
              width: "48px",
              align: "center",
            },
            {
              text: "label",
              key: "label",
              type: "string",
            },
            {
              text: "업데이트 사이클..?",
              key: "cycle",
              type: "string",
            },
            {
              text: "자세히",
              key: "",
              type: "button",
              onClick: (value: any) => {
                setEditArchivePopupActive(true);
                setEditArchivefield(value.label);
              },
              width: "80px",
              align: "center",
            },
          ]}
        />
      </div>
      {editArchivePopupActive && (
        <Popup
          contentScroll
          style={{ width: "800px" }}
          setState={setEditArchivePopupActive}
          title={`${editArchivefield}`}
          footer={
            <Button
              type={"ghost"}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              }}
            >
              저장
            </Button>
          }
        >
          <Button
            type={"ghost"}
            style={{
              borderRadius: "4px",
              marginBottom: "24px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            }}
          >
            필드 추가
          </Button>
          <Table
            filter
            filterSearch
            data={
              archiveTestData.filter((val) => val.label === editArchivefield)[0]
                .fields
            }
            header={[
              {
                text: "ID",
                key: "",
                type: "index",
                width: "48px",
                align: "center",
              },
              {
                text: "필드 이름",
                key: "label",
                type: "string",
              },

              {
                text: "자세히",
                key: "label",
                type: "button",
                onClick: (e: any) => {},
                width: "80px",
                align: "center",
              },
            ]}
          />
        </Popup>
      )}
    </>
  );
}

export default Archive;
