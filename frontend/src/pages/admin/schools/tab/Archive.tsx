import { useEffect, useRef, useState } from "react";

import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";
import Loading from "components/loading/Loading";

import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";
import { unflattenObject } from "functions/functions";

type Props = {};

const authTeacherToTextMap = new Map<string, string>();
authTeacherToTextMap.set("undefined", "미설정");
authTeacherToTextMap.set("viewAndEditStudents", "모든 학생 조회 및 수정");
authTeacherToTextMap.set("viewAndEditMyStudents", "담당 학생 조회 및 수정");

const textToAuthTeacherMap = new Map<string, string>();
for (let item of Array.from(authTeacherToTextMap)) {
  textToAuthTeacherMap.set(item[1], item[0]);
}

const authStudentToTextMap = new Map<string, string>();
authStudentToTextMap.set("undefined", "미설정");
authStudentToTextMap.set("view", "조회");
authStudentToTextMap.set("viewAndEdit", "조회 + 수정");

const textToAuthStudentMap = new Map<string, string>();
for (let item of Array.from(authStudentToTextMap)) {
  textToAuthStudentMap.set(item[1], item[0]);
}

function Archive(props: Props) {
  const { SchoolApi } = useApi();
  const { currentSchool } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const formData = useRef<any>([]);

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
    if (currentSchool?._id) {
      setIsLoading(true);
    }
  }, [currentSchool]);

  useEffect(() => {
    if (isLoading && currentSchool?._id) {
      SchoolApi.RSchool(currentSchool._id)
        .then((res) => {
          formData.current = res.formArchive;
        })
        .then(() => {
          setIsLoading(false);
        })
        .catch((err: any) => {
          alert("Failed to load data");
        });
    }
  }, [isLoading]);

  return !isLoading ? (
    <>
      <div style={{ marginTop: "24px" }}>
        <div style={{ marginTop: "24px" }}></div>
        <Table
          type="object-array"
          control
          data={
            formData.current.map((form: any) => {
              form.authTeacherText = authTeacherToTextMap.get(
                form.authTeacher ?? "undefined"
              );
              form.authStudentText = authStudentToTextMap.get(
                form.authStudent ?? "undefined"
              );
              return form;
            }) ?? []
          }
          onChange={(e) => {
            formData.current = e.map((v) => {
              v.authTeacher = textToAuthTeacherMap.get(
                v.authTeacherText ?? "미설정"
              );
              v.authStudent = textToAuthStudentMap.get(
                v.authStudentText ?? "미설정"
              );
              return unflattenObject(v);
            });
            SchoolApi.USchoolFormArchive({
              schoolId: currentSchool._id,
              data: formData.current,
            })
              .then((res) => {
                alert(SUCCESS_MESSAGE);
                formData.current = res;
              })
              .catch((err) => {
                alert("에러가 발생했습니다.");
                setIsLoading(true);
              });
          }}
          header={[
            {
              text: "이름",
              key: "label",
              type: "text",
            },
            {
              text: "선생님 권한",
              key: "authTeacherText",
              fontSize: "12px",
              fontWeight: "600",
              textAlign: "center",
              width: "200px",
              type: "select",
              option: Array.from(authTeacherToTextMap.values()),
            },
            {
              text: "학생 권한",
              key: "authStudentText",
              fontSize: "12px",
              fontWeight: "600",
              textAlign: "center",
              width: "200px",
              type: "select",
              option: Array.from(authStudentToTextMap.values()),
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
                schoolId: currentSchool._id,
                data: formData.current,
              })
                .then((res) => {
                  alert(SUCCESS_MESSAGE);
                  formData.current = res;
                })
                .catch((err) => {
                  alert("에러가 발생했습니다.");
                  setIsLoading(true);
                });
            }}
            header={
              formData.current[editArchivefieldIndex].dataType === "array"
                ? [
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
                  ]
                : [
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
                        file: {
                          text: "파일",
                          color: "#8657ff",
                        },
                        "file-image": {
                          text: "사진",
                          color: "#00B3AD",
                        },
                      },
                      width: "80px",
                      textAlign: "center",
                    },

                    {
                      text: "수정",
                      fontSize: "12px",
                      fontWeight: "600",
                      type: "rowEdit",
                      width: "80px",
                      textAlign: "center",
                    },
                  ]
            }
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
                schoolId: currentSchool._id,
                data: formData.current,
              })
                .then((res) => {
                  alert(SUCCESS_MESSAGE);
                  formData.current = res;
                })
                .catch((err) => {
                  alert("에러가 발생했습니다.");
                  setIsLoading(true);
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
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
}

export default Archive;
