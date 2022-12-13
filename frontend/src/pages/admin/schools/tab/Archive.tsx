import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Table from "components/table/Table";
import { useAuth } from "contexts/authContext";
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
          filter
          filterSearch
          data={archiveForm}
          header={[
            {
              text: "label",
              key: "label",
              type: "string",
            },
            {
              text: "데이터 형식",
              key: "dataType",
              type: "string",
              returnFunction: (value: any) => {
                return value === "object" ? "단일" : "누적";
              },
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
            type="object-array"
            filter
            filterSearch
            data={
              archiveForm?.filter(
                (val: any) => val.label === editArchivefield
              )[0].fields
            }
            header={[
              {
                text: "필드 이름",
                key: "label",
                type: "input",
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
