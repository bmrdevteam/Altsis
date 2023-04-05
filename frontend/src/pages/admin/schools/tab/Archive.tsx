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
  setSchoolData: any;
};

function Archive(props: Props) {
  const { SchoolApi } = useApi();
  const { currentSchool } = useAuth();
  const formData = useRef<any>(props.schoolData.formArchive || []);
  const [editArchivePopupActive, setEditArchivePopupActive] =
    useState<boolean>(false);
  const [editArchivefieldIndex, setEditArchivefieldIndex] = useState<number>(0);
  const [editArchivefieldSubIndex, setEditArchivefieldSubIndex] =
    useState<number>(0);

  const [
    editArchivefieldSelectPopupActive,
    setEditArchivefieldSelectPopupActive,
  ] = useState<boolean>(false);

  useEffect(() => {
    // console.log(props.schoolData);
  }, []);

  return (
    <>
      <div style={{ marginTop: "24px" }}>
        <div style={{ marginTop: "24px" }}></div>

        <Table
          type="object-array"
          control
          data={formData.current ?? []}
          onChange={(e) => {
            formData.current = e.map((v) => {
              return unflattenObject(v);
            });
            SchoolApi.USchoolFormArchive({
              schoolId: props.schoolData._id,
              data: formData.current,
            })
              .then((res) => {
                alert(SUCCESS_MESSAGE);
                props.setSchoolData({ ...props.schoolData, formArchive: res });
              })
              .catch((err) => {
                alert("에러가 발생했습니다.");
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
            // {
            //   text: "권한",
            //   key: "auth",
            //   fontSize: "12px",
            //   fontWeight: "600",
            //   type: "status",
            //   textAlign: "center",
            //   width: "120px",
            //   status: {
            //     teacher: {
            //       text: "모든 선생님",
            //       color: "#grey",
            //     },
            //     array: {
            //       text: "담임 선생님",
            //       color: "#3a44b5",
            //     },
            //   },
            // },
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
                setEditArchivefieldIndex(value.tableRowIndex - 1);
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
          closeBtn
          contentScroll
          style={{ width: "800px", borderRadius: "4px" }}
          setState={setEditArchivePopupActive}
          title={`${formData.current[editArchivefieldIndex].label}`}
        >
          <Table
            type="object-array"
            data={formData.current[editArchivefieldIndex].fields ?? []}
            onChange={(e) => {
              let fields = e.map((o) => unflattenObject(o));
              formData.current[editArchivefieldIndex].fields = fields;
              SchoolApi.USchoolFormArchive({
                schoolId: props.schoolData._id,
                data: formData.current,
              })
                .then((res) => {
                  alert(SUCCESS_MESSAGE);
                  props.setSchoolData({
                    ...props.schoolData,
                    formArchive: res,
                  });
                })
                .catch((err) => {
                  alert("에러가 발생했습니다.");
                });
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
                    text: "선택 +",
                    color: "#8657ff",
                    onClick: (row) => {
                      setEditArchivefieldSubIndex(row.tableRowIndex - 1);
                      setEditArchivefieldSelectPopupActive(true);
                    },
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
                textAlign: "center",
                width: "80px",
                type: "toggle",
              },
              {
                text: "누계합산",
                key: "runningTotal",
                textAlign: "center",
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
      {editArchivefieldSelectPopupActive && (
        <Popup
          contentScroll
          style={{ width: "600px", borderRadius: "4px" }}
          closeBtn
          setState={setEditArchivefieldSelectPopupActive}
          title={`${formData.current[editArchivefieldIndex].label}`}
        >
          <Table
            type="string-array"
            data={
              formData.current[editArchivefieldIndex].fields[
                editArchivefieldSubIndex
              ].options ?? []
            }
            onChange={(e) => {
              let _data: string[] = [];
              e.map((o) => {
                _data.push(o["0"]);
              });
              formData.current[editArchivefieldIndex].fields[
                editArchivefieldSubIndex
              ].options = _data;

              SchoolApi.USchoolFormArchive({
                schoolId: props.schoolData._id,
                data: formData.current,
              })
                .then((res) => {
                  alert(SUCCESS_MESSAGE);
                  props.setSchoolData({
                    ...props.schoolData,
                    formArchive: res,
                  });
                })
                .catch((err) => {
                  alert("에러가 발생했습니다.");
                });
            }}
            header={[
              {
                text: "옵션",
                key: "0",
                type: "text",
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
