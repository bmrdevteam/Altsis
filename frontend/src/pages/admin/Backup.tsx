/**
 * @file Academy Pid Page Tab Item - Backup
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

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
// hooks
import _ from "lodash";

// components
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import Loading from "components/loading/Loading";
import Select from "components/select/Select";
import Textarea from "components/textarea/Textarea";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAuth } from "contexts/authContext";

import style from "style/pages/admin/schools.module.scss";
import Skeleton from "components/skeleton/Skeleton";
import Navbar from "layout/navbar/Navbar";

type Props = {};

const Backup = (props: Props) => {
  const { AcademyAPI, FileAPI } = useAPIv2();
  const { currentUser } = useAuth();
  const { pid: tempId = "" } = useParams<"pid">();
  const { pid : academyId = "" } = {pid : currentUser.academyId} ?? tempId;
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /* document list */
  const [documentList, setDocumentList] = useState<any>();
  const [doc, setDoc] = useState<any>();

  /* popup activation */
  const [addPopupActive, setAddPopupActive] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [restorePopupActive, setRestorePopupActive] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [editPopupActive, setEditPopupActive] = useState(false);

  const fileInput = React.useRef<any>();
  const [selectedFile, setSelectedFile] = useState<any>();
  const [dataToRestore, setDataToRestore] = useState<any[]>([]);
  const handleProfileUploadButtonClick = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (fileInput.current) fileInput.current.click();
  };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files?.length === 0) return;
    if (e.target.files[0].type !== "application/json") {
      alert("JSON 파일을 업로드해주세요.");
      return;
    }
    setSelectedFile(e.target.files[0]);
    var reader = new FileReader();
    reader.onload = function (e) {
      if (typeof e.target?.result === "string") {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) {
          alert(
            `JSON 배열 형식으로 업로드해주세요.

___________________
example.json
___________________
[
    {
        _id: "asdfasdfds",
        userId: "user01",
    },
    {
        _id: "qwerqwer",
        userId: "user02",
    })
]`
          );
          setSelectedFile(undefined);
        } else {
          setDataToRestore(data);
        }
      }
    };
    reader.readAsText(e.target.files[0]);
  };

  useEffect(() => {
    if (isLoading) {
      AcademyAPI.RAcademyBackupList({ params: { academyId } })
        .then(({ backupList }) => {
          setDocumentList(backupList);
        })
        .then(() => setIsLoading(false))
        .catch(() => {
          alert("failed to load data");
        });
    }
    return () => {};
  }, [isLoading]);

  const handleFileDownload = async (key: string, title: string) => {
    try {
      const { preSignedUrl } = await FileAPI.RSignedUrlBackup({
        query: { key, fileName: title },
      });

      const anchor = document.createElement("a");
      anchor.href = preSignedUrl;
      anchor.download = title;
      anchor.click();
    } catch (err) {
      // console.log(err);
    }
  };

  const modelSelectRef = useRef<any[]>(["schools"]);

  return (
    <>
    <Navbar />
      <div className={style.section}>
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ flex: "1 1 0" }}>
            <div className={style.title}>백업 및 복구</div>
            <div className={style.description}>
              {currentUser !== undefined ? (
                `${currentUser.academyName} / ${currentUser.academyId}`
              ) : (
                <Skeleton height="22px" width="20%" />
              )}</div>
          </div>
        </div>
        <Button
          type={"ghost"}
          onClick={() => {
            modelSelectRef.current = ["schools"];
            setAddPopupActive(true);
          }}
          style={{
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
        >
          {"+ 백업"}
        </Button>
        <Button
          type={"ghost"}
          onClick={() => {
            modelSelectRef.current = [];
            setSelectedFile(null);
            setDataToRestore([]);
            const inputElem = document.createElement("input");
            inputElem.type = "file";
            inputElem.value = "";
            fileInput.current = inputElem;

            setRestorePopupActive(true);
          }}
          style={{
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            marginTop: "12px",
          }}
        >
          {"+ 복구"}
        </Button>
        <div style={{ marginTop: "24px" }} />
        <Table
          type="object-array"
          control
          defaultPageBy={10}
          data={documentList || []}
          header={[
            {
              text: "No",
              type: "text",
              key: "tableRowIndex",
              width: "48px",
              textAlign: "center",
            },
            {
              text: "제목",
              key: "title",
              type: "text",
              textAlign: "center",
              whiteSpace: "pre",
            },
            {
              text: "자세히",
              key: "detail",
              type: "button",
              onClick: (e: any) => {
                AcademyAPI.RAcademyBackup({
                  params: { academyId },
                  query: { title: e.title },
                }).then(({ backup }) => {
                  setDoc({ ...e, list: backup });
                  setEditPopupActive(true);
                });
              },
              width: "80px",
              textAlign: "center",
              btnStyle: {
                border: true,
                color: "var(--accent-1)",
                padding: "4px",
                round: true,
              },
            },
            {
              text: "삭제",
              key: "remove",
              type: "button",
              onClick: (e: any) => {
                if (window.confirm("정말 삭제하시겠습니까?") === true) {
                  AcademyAPI.DAcademyBackup({
                    params: { academyId },
                    query: { title: e.title },
                  })
                    .then(() => {
                      alert(SUCCESS_MESSAGE);
                      setIsLoading(true);
                    })
                    .catch((err) => {
                      ALERT_ERROR(err);
                    });
                }
              },
              width: "80px",
              textAlign: "center",
              btnStyle: {
                border: true,
                color: "red",
                padding: "4px",
                round: true,
              },
            },
          ]}
        />
      {addPopupActive && (
        <Popup
          setState={setAddPopupActive}
          style={{
            maxWidth: "480px",
            maxHeight: "600px",
            width: "100%",
          }}
          closeBtn
          title={"아카데미 데이터 백업"}
          contentScroll
          footer={
            <Button
              disabled={isCreatingBackup}
              type={"ghost"}
              onClick={async () => {
                try {
                  setIsCreatingBackup(true);
                  await AcademyAPI.CAcademyBackup({
                    params: { academyId },
                    data: { models: modelSelectRef.current },
                  });
                  setIsCreatingBackup(false);
                  setAddPopupActive(false);
                  alert(SUCCESS_MESSAGE);
                  setIsLoading(true);
                } catch (err: any) {
                  ALERT_ERROR(err);
                  setIsCreatingBackup(false);
                  setAddPopupActive(false);
                }
              }}
            >
              + 백업
            </Button>
          }
        >
          {!isCreatingBackup ? (
            <div style={{ marginTop: "24px" }}>
              <Table
                // control
                type="object-array"
                data={[
                  { title: "schools", description: "학교" },
                  { title: "users", description: "사용자" },
                  { title: "archives", description: "기록" },
                  { title: "seasons", description: "학기" },
                  { title: "registrations", description: "등록 정보" },
                  { title: "syllabuses", description: "강의계획서" },
                  { title: "enrollments", description: "수강 정보" },
                  { title: "forms", description: "양식" },
                  { title: "notifications", description: "알림" },
                ]}
                control
                defaultPageBy={10}
                onChange={(value: any[]) => {
                  modelSelectRef.current = _.filter(value, {
                    tableRowChecked: true,
                  });
                }}
                header={[
                  {
                    text: "선택",
                    key: "",
                    type: "checkbox",
                  },
                  {
                    text: "모델명",
                    key: "title",
                    type: "text",
                    textAlign: "center",
                  },
                  {
                    text: "비고",
                    key: "description",
                    type: "text",
                    textAlign: "center",
                  },
                ]}
              />
            </div>
          ) : (
            <div style={{ marginTop: "24px" }}>
              <Loading text="생성중" />
              <div style={{ textAlign: "center", marginTop: "12px" }}>
                데이터 크기에 따라 시간이 오래 소요될 수 있습니다.
              </div>
            </div>
          )}
        </Popup>
      )}
      {restorePopupActive && (
        <Popup
          setState={setRestorePopupActive}
          style={{
            borderRadius: "8px",
            maxWidth: "480px",
            maxHeight: "600px",
            width: "100%",
          }}
          closeBtn
          title={"아카데미 데이터 복구"}
          contentScroll
          footer={
            <Button
              disabled={isRestoring}
              type={"ghost"}
              onClick={async () => {
                if (!selectedFile) {
                  alert("파일을 선택해주세요.");
                } else {
                  try {
                    setIsRestoring(true);
                    await AcademyAPI.URestoreAcademy({
                      params: { academyId },
                      data: {
                        model: modelSelectRef.current[0],
                        documents: dataToRestore,
                      },
                    });
                    setIsRestoring(false);
                    setRestorePopupActive(false);
                    alert(SUCCESS_MESSAGE);
                  } catch (err) {
                    ALERT_ERROR(err);
                    setIsRestoring(false);
                    setRestorePopupActive(false);
                  }
                }
              }}
            >
              + 복구
            </Button>
          }
        >
          {!isRestoring ? (
            <div style={{ marginTop: "24px" }}>
              <Select
                appearence="flat"
                label={"모델 선택"}
                required
                setValue={(e: string) => (modelSelectRef.current = [e])}
                options={[
                  { text: "schools(학교)", value: "schools" },
                  { text: "users(사용자)", value: "users" },
                  { text: "archives(기록)", value: "archives" },
                  { text: "seasons(학기)", value: "seasons" },
                  { text: "registrations(등록 정보)", value: "registrations" },
                  { text: "syllabuses(강의계획서)", value: "syllabuses" },
                  { text: "enrollments(수강 정보)", value: "enrollments" },
                  { text: "forms(양식)", value: "forms" },
                  { text: "notifications(알림)", value: "notifications" },
                ]}
                defaultSelectedIndex={0}
              />
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
                    {selectedFile
                      ? `${selectedFile.name} (${dataToRestore.length} documents)`
                      : "선택된 파일이 없습니다."}
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
              <Textarea
                disabled
                defaultValue={
                  selectedFile
                    ? dataToRestore.length <= 10000
                      ? JSON.stringify(dataToRestore, null, "\t")
                      : JSON.stringify(dataToRestore[0], null, "\t") + "....."
                    : ""
                }
                rows={15}
                style={{ marginTop: "12px" }}
              />
            </div>
          ) : (
            <div style={{ marginTop: "24px" }}>
              <Loading text="복구중" />
              <div style={{ textAlign: "center", marginTop: "12px" }}>
                데이터 크기에 따라 시간이 오래 소요될 수 있습니다.
              </div>
            </div>
          )}
        </Popup>
      )}
      {editPopupActive && (
        <Popup
          closeBtn
          title={`${doc.title}`}
          setState={setEditPopupActive}
          style={{
            maxWidth: "800px",
            width: "100%",
          }}
          contentScroll
        >
          <Table
            type="object-array"
            control
            defaultPageBy={10}
            data={doc.list || []}
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
              },
              {
                text: "제목",
                key: "title",
                type: "text",
                textAlign: "center",
              },
              {
                text: "크기(KB)",
                key: "size",
                type: "text",
                textAlign: "center",
              },
              {
                text: "다운로드",
                key: "download",
                type: "button",
                onClick: (e: any) => {
                  handleFileDownload(e.key, e.title);
                },
                width: "120px",
                textAlign: "center",
                btnStyle: {
                  border: true,
                  color: "var(--accent-1)",
                  padding: "4px",
                  round: true,
                },
              },
            ]}
          />
        </Popup>
      )}
      </div>
    </>
  );
};

export default Backup;
