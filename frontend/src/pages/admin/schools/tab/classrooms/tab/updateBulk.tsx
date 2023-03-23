/**
 * @file User Page Tab Item - Basic
 *
 * @author jessie129j <jessie129j@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 * @version 1.0
 *
 */

import React, { useState, useRef, useEffect } from "react";
import * as xlsx from "xlsx";
import _ from "lodash";
import useApi from "hooks/useApi";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";

import exampleData from "../../../exampleData/classroomsExampleData";

type Props = {
  setPopupActive: any;
  schoolData: any;
  setSchoolData: any;
};

function Basic(props: Props) {
  const { SchoolApi } = useApi();

  const fileInput = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>();

  /* classroom list */
  const [classroomList, setClassroomList] = useState<any[]>([]);

  // popup activation
  const [isHelpPopupActive, setIsHelpPopupActive] = useState<boolean>(false);

  const description = `1. 엑셀을 열어 A1셀에 '강의실'을 입력합니다.\n
2. 강의실을 B1셀부터 입력합니다.`;

  const fileToUserList = (file: any) => {
    var reader = new FileReader();

    reader.onload = function () {
      const res: any[] = [];
      var fileData = reader.result;
      var wb = xlsx.read(fileData, { type: "binary" });
      wb.SheetNames.forEach(function (sheetName) {
        var rowObjList = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
        res.push(...rowObjList.map((obj: any) => obj["강의실"] || ""));
      });
      setClassroomList(res);
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

  useEffect(() => {
    if (selectedFile) {
      fileToUserList(selectedFile);
    }
  }, [selectedFile]);

  const handleProfileUploadButtonClick = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (fileInput.current) fileInput.current.click();
  };

  const exampleDownload1 = () => {
    const ws = xlsx.utils.json_to_sheet(exampleData.data1);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
    xlsx.writeFile(wb, `example.xlsx`);
  };

  const exampleDownload2 = () => {
    const ws = xlsx.utils.json_to_sheet(exampleData.data2);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
    xlsx.writeFile(wb, `example.xlsx`);
  };

  return (
    <>
      <Popup
        setState={props.setPopupActive}
        style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
        closeBtn
        title="강의실 일괄 생성"
        contentScroll
        footer={
          <Button
            type={"ghost"}
            onClick={() => {
              SchoolApi.USchoolClassroom({
                schoolId: props.schoolData?._id,
                data: classroomList,
              })
                .then((res) => {
                  props.setSchoolData({
                    ...props.schoolData,
                    classrooms: res,
                  });
                  alert("success");
                })
                .catch((err) => {
                  alert(err.response.data.message);
                });
            }}
            style={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            }}
          >
            생성
          </Button>
        }
      >
        <div className={style.popup}>
          <div style={{ display: "flex", gap: "24px" }}>
            <Button
              type={"ghost"}
              onClick={() => {
                setIsHelpPopupActive(true);
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                width: "120px",
              }}
            >
              도움말 열기
            </Button>
          </div>

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
            <Table
              data={classroomList}
              type="string-array"
              header={[
                {
                  text: "No",
                  type: "text",
                  key: "tableRowIndex",
                  width: "48px",
                  textAlign: "center",
                },
                {
                  text: "강의실",
                  key: "0",
                  type: "text",
                },
              ]}
            />
          </div>
        </div>
      </Popup>
      {isHelpPopupActive && (
        <Popup
          title="도움말"
          closeBtn
          setState={setIsHelpPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
        >
          <div className={style.popup}>
            <div
              style={{
                whiteSpace: "pre-wrap",
              }}
            >
              {description}
            </div>

            <div style={{ display: "flex", gap: "24px" }}>
              {" "}
              <Button
                type={"ghost"}
                onClick={() => {
                  exampleDownload1();
                }}
                style={{
                  borderRadius: "4px",
                  height: "32px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                  marginTop: "24px",
                  width: "120px",
                }}
              >
                예시1 다운로드
              </Button>
              <Button
                type={"ghost"}
                onClick={() => {
                  exampleDownload2();
                }}
                style={{
                  borderRadius: "4px",
                  height: "32px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                  marginTop: "24px",
                  width: "120px",
                }}
              >
                예시2 다운로드
              </Button>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}

export default Basic;
