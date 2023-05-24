import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import style from "style/pages/archive.module.scss";
import React, { useRef, useEffect, useState } from "react";
import Popup from "components/popup/Popup";
import Callout from "components/callout/Callout";
import _ from "lodash";
import { objectDownloadAsXlxs } from "functions/functions";
import * as xlsx from "xlsx";

const ExcelPopup = (props: {
  type: "array" | "object";
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  fields: any[];
  pid: string;
  archiveList: any[];
  userNameStatus?: any;
  setIsUpdating: React.Dispatch<React.SetStateAction<boolean>>;
  archiveListRef: React.MutableRefObject<any>;
}) => {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>();

  // popup activation
  const [isAddPopupActive, setIsAddPopupActive] = useState<boolean>(false);

  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (selectedFile) {
      parseFile(selectedFile);
    }
  }, [selectedFile]);

  const parseFile = (file: any) => {
    var reader = new FileReader();

    reader.onload = function () {
      const fileData = reader.result;
      const wb = xlsx.read(fileData, { type: "binary" });
      let rowObjList: any[] = xlsx.utils.sheet_to_json(
        wb.Sheets[wb.SheetNames[0]]
      );
      const data: any[] = [];
      for (let i = 1; i < rowObjList.length; i++) {
        if ("#_id" in rowObjList[i]) {
          const archive = _.find(
            props.archiveList,
            (a) => a._id === rowObjList[i]["#_id"]
          );
          if (archive) {
            const item: { [key: string]: string } = {
              _id: archive._id,
              grade: archive.grade,
              userName: archive.userName,
              userId: archive.userId,
              registration: archive.registration,
            };
            for (let field of props.fields) {
              console.log(field);
              if (field.type === "file" || field.type === "file-image") {
                item[field.label] = archive[field.label];
              } else {
                item[field.label] = rowObjList[i][field.label];
              }
            }
            data.push(item);
          }
        }
      }
      setData(data);
    };
    reader.readAsBinaryString(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files?.length === 0) return;
    if (
      e.target.files[0].type !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      alert("지원되지 않는 파일 형식입니다.");
      return;
    }
    setSelectedFile(e.target.files[0]);
  };

  const handleProfileUploadButtonClick = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (fileInput.current) fileInput.current.click();
  };

  const exampleDownload = () => {
    const description: { [key: string]: string } = {};

    for (let field of props.fields) {
      if (field.type === "input") {
        description[field.label] = "문자열";
      } else if (field.type === "input-number") {
        description[field.label] = "숫자";
      } else if (field.type === "select") {
        description[field.label] = `선택(${_.join(field.options, "/")})`;
      }
    }

    objectDownloadAsXlxs({
      title: props.pid,
      sheets: [
        {
          title: props.pid,
          header: [
            "#_id",
            "#학년",
            "#이름",
            "#ID",
            ...props.fields
              .filter(
                (field) => field.type !== "file" && field.type !== "file-image"
              )
              .map((field) => field.label),
          ],
          data: [
            description,
            ...props.archiveListRef.current.map((a: any) => {
              return {
                "#_id": a._id,
                "#학년": a.grade,
                "#이름": a.userName,
                "#ID": a.userId,
                ...a,
              };
            }),
          ],
        },
        {
          title: "학생 목록",
          header: ["#_id", "#학년", "#이름", "#ID"],
          data: props.archiveList.map((a) => {
            return {
              "#_id": a._id,
              "#학년": a.grade,
              "#이름": a.userName,
              "#ID": a.userId,
            };
          }),
        },
      ],
    });
  };

  const header = () => {
    const arr: any[] = [
      props.type === "array"
        ? {
            text: "#이름",
            whiteSpace: "pre",
            key: "_id",
            type: "status",
            width: "124px",
            textAlign: "center",
            status: props.userNameStatus,
            fontWeight: "600",
          }
        : {
            text: "#이름",
            whiteSpace: "pre",
            key: "userName",
            width: "124px",
            textAlign: "center",
            fontWeight: "600",
          },
    ];
    for (let field of props.fields.filter(
      (field) => field.type !== "file" && field.type !== "file-image"
    )) {
      arr.push({
        text: field.label,
        whiteSpace: "pre",
        key: field.label,
      });
    }
    return arr;
  };

  const description = () => {
    if (props.type === "array") {
      return (
        <ol>
          <li>
            <b>양식</b>을 다운받습니다.
          </li>
          <li>첫 번째 행은 양식 필드입니다.</li>
          <li>두 번째 행은 양식 필드의 형식을 설명합니다.</li>
          <li>수정 사항은 세 번째 행부터 적용됩니다.</li>
          <li>행을 삭제하여 기록을 삭제할 수 있습니다.</li>
          <li>
            행을 추가하여 기록을 추가할 수 있습니다.
            <ul>
              <li>
                학생 식별키(#_id, #학년, #이름, #ID)를 함께 복사하여 기록을
                추가해주세요.
              </li>
              <li>
                첫 번째 시트에 학생의 식별키가 없는 경우 두 번째 시트에서
                찾아주세요.
              </li>
            </ul>
          </li>
        </ol>
      );
    }
    return (
      <ol>
        <li>
          <b>양식</b>을 다운받습니다.
        </li>
        <li>첫 번째 행은 양식 필드입니다.</li>
        <li>두 번째 행은 양식 필드의 형식을 설명합니다.</li>
        <li>수정 사항은 세 번째 행부터 적용됩니다.</li>
        <li>학생 식별키(#_id, #학년, #이름, #ID)는 수정할 수 없습니다.</li>
        <li>파일 또는 사진 필드는 엑셀 파일로 수정할 수 없습니다.</li>
      </ol>
    );
  };
  return (
    <>
      <Popup
        setState={props.setPopupActive}
        style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
        closeBtn
        title="엑셀 파일로 수정"
        contentScroll
        footer={
          <Button
            type={"ghost"}
            onClick={() => {
              if (!selectedFile) {
                alert("파일을 선택해주세요.");
              } else {
                props.archiveListRef.current = data;
                props.setPopupActive(false);
                props.setIsUpdating(true);
              }
            }}
            style={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            }}
          >
            수정
          </Button>
        }
      >
        <div className={style.popup}>
          <Callout
            style={{ marginBottom: "24px" }}
            type={"info"}
            title={"도움말"}
            child={description()}
            showIcon
          />

          <Button
            type={"ghost"}
            onClick={() => {
              exampleDownload();
            }}
            style={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              width: "120px",
            }}
          >
            양식 다운로드
          </Button>

          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <React.Fragment>
              <Button
                type={"ghost"}
                style={{
                  borderRadius: "4px",
                  height: "32px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                  width: "120px",
                }}
                onClick={handleProfileUploadButtonClick}
              >
                {selectedFile ? "파일 변경" : "파일 선택"}
              </Button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: "gray",
                }}
              >
                {selectedFile ? selectedFile.name : "선택된 파일이 없습니다."}
              </div>

              <input
                type="file"
                ref={fileInput}
                style={{ display: "none" }}
                onChange={(e: any) => {
                  handleFileChange(e);
                  e.target.value = "";
                }}
              />
            </React.Fragment>
          </div>
          <div style={{ marginTop: "24px" }}>
            <Table type="object-array" data={data} header={header()} />
          </div>
        </div>
      </Popup>
      {isAddPopupActive && (
        <Popup
          title="생성"
          closeBtn
          setState={setIsAddPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
        >
          <div className={style.popup}>
            <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
              아카데미 사용자를 학교에 등록할 수 있습니다.
            </div>
            <div style={{ marginTop: "24px" }}>
              <Table
                type="object-array"
                data={[]}
                onChange={(value: any[]) => {}}
                header={header()}
              />
            </div>

            <Button
              type={"ghost"}
              onClick={() => {
                alert("clicked");
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                marginTop: "24px",
              }}
            >
              사용자 생성
            </Button>
          </div>
        </Popup>
      )}
    </>
  );
};
export default ExcelPopup;
