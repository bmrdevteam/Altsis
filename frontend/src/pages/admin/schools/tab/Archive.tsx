import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";
import useDatabase from "hooks/useDatabase";
import React, { useEffect, useState } from "react";
type Props = {
  schoolData: any;
};

function Archive(props: Props) {
  const database = useDatabase();

  const [archiveForm, setArchiveForm] = useState<any>();
  const [editArchivePopupActive, setEditArchivePopupActive] =
    useState<boolean>(false);
  const [editArchivefield, setEditArchivefield] = useState<string>();

  async function updateFormArchive() {
    const result = await database.U({
      location: `schools/${props.schoolData._id}/form/archive`,
      data: { new: archiveForm },
    });
    return result;
  }
  useEffect(() => {
    database
      .R({
        location: `schools/${props.schoolData._id}`,
      })
      .then((res) => {
        setArchiveForm(res.formArchive);
      });
  }, []);

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
          onClick={() => {
            updateFormArchive().then((res) => {
              console.log(res);
            });
          }}
        >
          + 새로운 아카이브 추가
        </Button>
        <div style={{ marginTop: "24px" }}></div>

        <Table
          type="object-array"
          control
          data={archiveForm ?? []}
          header={[
            {
              text: "이름",
              key: "label",
              type: "text",
            },
            {
              text: "데이터 형식",
              key: "dataType",
              fontSize: "12px",
              fontWeight: "600",
              type: "status",
              textAlign: "center",
              width: "120px",
              status: {
                object: {
                  text: "단일",
                  color: "#3a44b5",
                },
                array: {
                  text: "누적",
                  color: "#c95636",
                },
              },
            },
            {
              text: "자세히",
              type: "button",
              fontSize: "12px",
              fontWeight: "600",
              textAlign: "center",
              btnStyle: {
                border: true,
                color: "green",
                padding: "4px",
                round: true,
              },
              onClick: (value: any) => {
                setEditArchivePopupActive(true);
                setEditArchivefield(value.label);
              },
              width: "80px",
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
            type="object-array"
            data={
              archiveForm?.filter(
                (val: any) => val.label === editArchivefield
              )[0].fields || []
            }
            header={[
              {
                text: "필드 이름",
                key: "label",
                type: "text",
              },

              {
                text: "자세히",
                key: "label",
                type: "button",
                onClick: (e: any) => {},
                width: "80px",
                textAlign: "center",
              },
            ]}
          />
        </Popup>
      )}
    </>
  );
}

export default Archive;
