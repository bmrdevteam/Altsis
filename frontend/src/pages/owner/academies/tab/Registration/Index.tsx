/**
 * @file Academy Pid Page Tab Item - Registration
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
import { copyClipBoard } from "functions/functions";

// components
import Table from "components/tableV2/Table";
import Tab from "components/tab/Tab";
import Popup from "components/popup/Popup";

// tab elements
import Basic from "./tab/Basic";
import useAPIv2 from "hooks/useAPIv2";

type Props = {};

const Registration = (props: Props) => {
  const { AcademyAPI } = useAPIv2();
  const { pid: academyId = "" } = useParams<"pid">();

  /* document list */
  const [documentList, setDocumentList] = useState<any>();
  const [doc, setDoc] = useState<any>();

  /* popup activation */
  const [editPopupActive, setEditPopupActive] = useState(false);

  async function getDocumentList() {
    const { documents } = await AcademyAPI.RAcademyDocuments({
      params: { academyId, docType: "registrations" },
    });
    return documents;
  }

  async function getDocument(id: string) {
    const { document } = await AcademyAPI.RAcademyDocument({
      params: { academyId, docType: "registrations", docId: id },
    });
    return document;
  }

  useEffect(() => {
    getDocumentList()
      .then((res) => {
        setDocumentList(res);
      })
      .catch(() => {
        alert("failed to load data");
      });
    return () => {};
  }, []);

  return (
    <div style={{ marginTop: "24px" }}>
      <Table
        type="object-array"
        control
        defaultPageBy={50}
        data={documentList || []}
        header={[
          {
            text: "🗗",
            key: "_id_copy",
            type: "button",
            textAlign: "center",
            width: "48px",
            onClick: (e: any) => {
              copyClipBoard(e._id).then((text) => {
                alert(`copied => ${text}`);
              });
            },
          },
          {
            text: "_id",
            key: "_id",
            type: "text",
            textAlign: "center",
            width: "96px",
          },
          {
            text: "학교 ID",
            key: "schoolId",
            type: "text",
          },
          {
            text: "학교 이름",
            key: "schoolName",
            type: "text",
          },
          {
            text: "학년도",
            key: "year",
            type: "text",
          },
          {
            text: "학기",
            key: "term",
            type: "text",
          },
          {
            text: "ID",
            key: "userId",
            type: "text",
            textAlign: "center",
            whiteSpace: "pre",
          },
          {
            text: "이름",
            key: "userName",
            type: "text",
            textAlign: "center",
            whiteSpace: "pre",
          },
          {
            text: "학년",
            key: "grade",
            type: "text",
            textAlign: "center",
            whiteSpace: "pre",
          },

          {
            text: "자세히",
            key: "detail",
            type: "button",
            onClick: (e: any) => {
              getDocument(e._id).then((res) => {
                setDoc(res);
                setEditPopupActive(true);
              });
            },
            width: "72px",
            textAlign: "center",
            btnStyle: {
              border: true,
              color: "black",
              padding: "4px",
              round: true,
            },
          },
        ]}
      />
      {editPopupActive && (
        <Popup
          closeBtn
          title="Edit Document"
          setState={setEditPopupActive}
          style={{ maxWidth: "1000px", width: "100%" }}
          contentScroll
        >
          <Tab
            dontUsePaths
            items={{
              "기본 정보": (
                <Basic academyId={academyId} registrationData={doc} />
              ),
            }}
            align={"flex-start"}
          />
        </Popup>
      )}
    </div>
  );
};

export default Registration;
