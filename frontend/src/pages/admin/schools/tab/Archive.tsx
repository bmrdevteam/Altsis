import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";
import { useAuth } from "contexts/authContext";
import { unflattenObject } from "functions/functions";
import useApi from "hooks/useApi";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
type Props = {
  schoolData: any;
};

function Archive(props: Props) {
  const { SchoolApi } = useApi();
  const { currentSchool } = useAuth();
  const formData = useRef<any>(currentSchool.formArchive);
  const [editArchivePopupActive, setEditArchivePopupActive] =
    useState<boolean>(false);
  const [editArchivefield, setEditArchivefield] = useState<string>();

  useEffect(() => {
    console.log(props.schoolData);
  }, []);

  return (
    <>
      <div style={{ marginTop: "24px" }}>
        <Button
          type={"ghost"}
          onClick={() => {
            SchoolApi.USchoolFormArchive({
              schoolId: props.schoolData._id,
              data: formData.current,
            })
              .then(() => alert("저장 성공"))
              .catch(() => alert("저장 실패"));
          }}
        >
          저장
        </Button>
        <div style={{ marginTop: "24px" }}></div>

        <Table
          type="object-array"
          control
          data={formData.current ?? []}
          onChange={(e) => {
            formData.current = e.map((v) => {
              return unflattenObject(v);
            });
          }}
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
              text: "권한",
              key: "auth",
              fontSize: "12px",
              fontWeight: "600",
              type: "status",
              textAlign: "center",
              width: "120px",
              status: {
                teacher: {
                  text: "모든 선생님",
                  color: "#grey",
                },
                array: {
                  text: "담임 선생님",
                  color: "#3a44b5",
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
              onClick={() => {
                SchoolApi.USchoolFormArchive({
                  schoolId: props.schoolData._id,
                  data: formData.current,
                })
                  .then(() => alert("저장 성공"))
                  .catch(() => alert("저장 실패"));
              }}
            >
              저장
            </Button>
          }
        >
          <Table
            type="object-array"
            data={
              formData.current?.filter(
                (val: any) => val.label === editArchivefield
              )[0].fields ?? []
            }
            onChange={(e) => {
              let fields = e.map((o) => unflattenObject(o));
              formData.current.find(
                (o: any) => o.label === editArchivefield
              ).fields = fields;
            }}
            header={[
              {
                text: "필드 이름",
                key: "label",
                type: "text",
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
                  select: {
                    text: "선택",
                    color: "#006663",
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
                text: "합산",
                key: "total",
                textAlign:"center",
                width: "80px",
                type: "toggle",
              },
              {
                text: "누계합산",
                key: "runningTotal",
                textAlign:"center",
                width: "80px",
                type: "toggle",
              },
              {
                text: "수정",
                fontSize: "12px",
                fontWeight: "600",
                type: "rowEdit",
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
