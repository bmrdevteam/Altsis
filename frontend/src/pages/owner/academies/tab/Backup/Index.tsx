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

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
// hooks
import useDatabase from "hooks/useDatabase";
import _ from "lodash";

// components
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";

type Props = {};

const Backup = (props: Props) => {
  const database = useDatabase();
  const { pid: academyId = "" } = useParams<"pid">();

  /* document list */
  const [documentList, setDocumentList] = useState<any>();
  const [doc, setDoc] = useState<any>();

  /* popup activation */
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

  useEffect(() => {
    getDocumentList()
      .then((res) => {
        setDocumentList(_.sortBy(res, "lastModified").reverse());
      })
      .catch(() => {
        alert("failed to load data");
      });
    return () => {};
  }, []);

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

  return (
    <>
      <div style={{ marginTop: "24px" }}>
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
