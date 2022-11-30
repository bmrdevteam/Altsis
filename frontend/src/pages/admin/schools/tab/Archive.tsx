import { archiveTestData } from "archiveTest";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Table from "components/table/Table";
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";
import React, { useState } from "react";
type Props = {
  school?: any;
};

function Archive(props: Props) {
  const database = useDatabase();
  const [editArchivePopupActive, setEditArchivePopupActive] =
    useState<boolean>(false);
  const [editArchivefield, setEditArchivefield] = useState<string>();
  async function updateFormArchive() {
    const result = await database.U({
      location: `schools/${props.school._id}/form/archive`,
      data: [
        {
          label: "인적사항",
          cycle: "unset",
          auth: "teacher / student / teacherID / admin",
          dataType: "single..?단일 데이터",
          fields: [
            {
              label: "성명",
              type: "string",
            },
            {
              label: "성별",
              type: "string",
            },
            {
              label: "주민등록번호",
              type: "string",
            },
            {
              label: "주소",
              type: "string",
            },
            {
              label: "성명(부)",
              type: "string",
            },
            {
              label: "성명(모)",
              type: "string",
            },
            {
              label: "생년월일(부)",
              type: "date",
            },
            {
              label: "생년월일(모)",
              type: "date",
            },
            {
              label: "특기사항",
              type: "string",
            },
          ],
        },
        {
          label: "학적사항",
          cycle: "unset",
          dataType: "multiple",
        },
        {
          label: "수상경력",
          cycle: "unset",
          dataType: "multiple",
        },
        {
          label: "자격증 및 취득사항",
          cycle: "unset",
          dataType: "multiple",
        },
        {
          label: "독서 활동",
          cycle: "year",
          dataType: "multiple",
        },
        {
          label: "봉사 활동",
          cycle: "unset",
          dataType: "multiple",
          fields: [
            {
              label: "학년",
              type: "select",
              options: ["11학년", "12학년", "10학년"],
            },
            {
              label: "일자 또는 기간",
              type: "dateDuration",
            },
            {
              label: "장소 또는 주관기관명",
              type: "string",
            },
            {
              label: "활동내용",
              type: "string",
            },
            {
              label: "시간",
              type: "time",
            },
          ],
        },
      ],
    });
    return result;
  }

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
          data={archiveTestData}
          header={[
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
              text: "데이터 형식",
              key: "dataType",
              type: "string",
              returnFunction: (value: any) => {
                return value === "single" ? "단일" : "누적";
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
              archiveTestData.filter((val) => val.label === editArchivefield)[0]
                .fields
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
