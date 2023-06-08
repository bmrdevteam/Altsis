/**
 * @file Seasons - Classrooms - UpdateBulkPopup
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

// components
import Button from "components/button/Button";
import Table from "components/table/Table";

type Props = {
  classroomListRef: React.MutableRefObject<string[]>;
};

function Upload(props: Props) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>();

  /* classroom list */
  const [classroomList, setClassroomList] = useState<any[]>(
    props.classroomListRef.current
  );

  const fileToClassroomList = (file: any) => {
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
      props.classroomListRef.current = res;
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
      fileToClassroomList(selectedFile);
    }
    return () => {};
  }, [selectedFile]);

  const handleProfileUploadButtonClick = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (fileInput.current) fileInput.current.click();
  };

  return (
    <div>
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
              text: "ID",
              key: "",
              type: "index",
              width: "48px",
              align: "center",
            },
            {
              text: "강의실",
              key: 0,
              type: "string",
            },
          ]}
        />
      </div>
    </div>
  );
}

export default Upload;
