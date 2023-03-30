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

import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
// hooks
import useDatabase from "hooks/useDatabase";
import _ from "lodash";

// components
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import Loading from "components/loading/Loading";

type Props = {};

const Backup = (props: Props) => {
  const database = useDatabase();
  const { pid: academyId = "" } = useParams<"pid">();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /* document list */
  const [documentList, setDocumentList] = useState<any>();
  const [doc, setDoc] = useState<any>();

  /* popup activation */
  const [addPopupActive, setAddPopupActive] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editPopupActive, setEditPopupActive] = useState(false);

  async function getDocumentList() {
    const { list } = await database.R({
      location: `files/backup?academyId=${academyId}`,
    });
    return list;
  }

  async function getDocument(title: string) {
    const { list } = await database.R({
      location: `files/backup?academyId=${academyId}&title=${title}`,
    });
    return list;
  }

  async function createBackup(models: string[]) {
    const res = await database.C({
      location: `files/backup?academyId=${academyId}`,
      data: { models },
    });
    return res;
  }

  useEffect(() => {
    if (isLoading) {
      getDocumentList()
        .then((res) => {
          setDocumentList(_.sortBy(res, "title").reverse());
        })
        .then(() => setIsLoading(false))
        .catch(() => {
          alert("failed to load data");
        });
    }
    return () => {};
  }, [isLoading]);

  async function getPresinedUrl(key: string, title: string) {
    const { preSignedUrl, expiryDate } = await database.R({
      location: `files/signed?key=${key}&fileName=${title}`,
    });
    return { preSignedUrl, expiryDate };
  }

  const handleFileDownload = async (key: string, title: string) => {
    try {
      const { preSignedUrl, expiryDate } = await getPresinedUrl(key, title);

      const anchor = document.createElement("a");
      anchor.href = preSignedUrl;
      anchor.download = title;
      anchor.click();
    } catch (err) {
      // console.log(err);
    }
  };

  const modelSelectRef = useRef<any[]>([]);

  return (
    <>
      <div style={{ marginTop: "24px" }}>
        <Button
          type={"ghost"}
          onClick={() => {
            modelSelectRef.current = [];
            setAddPopupActive(true);
          }}
          style={{
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
        >
          {"+ 백업 생성"}
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
                console.log(e);
                getDocument(e.title).then((res) => {
                  console.log(res);
                  setDoc({ ...e, list: res });
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
          ]}
        />
      </div>
      {addPopupActive && (
        <Popup
          setState={setAddPopupActive}
          style={{
            borderRadius: "8px",
            maxWidth: "480px",
            maxHeight: "600px",
            width: "100%",
          }}
          closeBtn
          title={"아카데미 데이터 백업"}
          contentScroll
          footer={
            <Button
              disabled={isAdding}
              type={"ghost"}
              onClick={async () => {
                try {
                  setIsAdding(true);
                  await createBackup(modelSelectRef.current);
                  setIsAdding(false);
                  setAddPopupActive(false);
                  alert(SUCCESS_MESSAGE);
                  setIsLoading(true);
                } catch {
                  alert("error!");
                }
              }}
            >
              + 백업 생성
            </Button>
          }
        >
          {!isAdding ? (
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
      {editPopupActive && (
        <Popup
          closeBtn
          title={`${doc.title}`}
          setState={setEditPopupActive}
          style={{
            borderRadius: "8px",
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
    </>
  );
};

export default Backup;
