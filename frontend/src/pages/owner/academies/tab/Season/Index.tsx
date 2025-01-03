/**
 * @file Academy Pid Page Tab Item - Season
 *
 * @author jessie129j <jessie129j@gmail.com>
 *
 *
 * @todo create sesons tab
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
import { copyClipBoard } from "functions/functions";

// components
import Table from "components/tableV2/Table";
import Tab from "components/tab/Tab";
import Popup from "components/popup/Popup";

// tab elements
import Basic from "./tab/Basic";
import User from "./tab/User";
import Classroom from "./tab/Classroom";
import Subjects from "./tab/Subject";
// import Permission from "./tab/Permission"; deprecated
import Form from "./tab/Form";
import useAPIv2 from "hooks/useAPIv2";

// functions
import { objectDownloadAsJson } from "functions/functions";

type Props = {};

const Season = (props: Props) => {
  const { AcademyAPI } = useAPIv2();
  const [isLoading, setIsLoading] = useState(true);
  const { pid: academyId = "" } = useParams<"pid">();
  const { school } = useParams<"school">();

  /* document list */
  const [documentList, setDocumentList] = useState<any>();
  const [doc, setDoc] = useState<any>();

  /* popup activation */
  const [editPopupActive, setEditPopupActive] = useState(false);

  async function getDocumentList() {
    const { documents } = await AcademyAPI.RAcademyDocuments({
      params: { academyId, docType: "seasons" },
      query: school ? { school } : undefined,
    });
    return documents;
  }

  async function getDocument(id: string) {
    const { document } = await AcademyAPI.RAcademyDocument({
      params: { academyId, docType: "seasons", docId: id },
    });
    return document;
  }

  useEffect(() => {
    if (isLoading) {
      getDocumentList()
        .then((res) => {
          setDocumentList(res);
        })
        .then(() => setIsLoading(false))
        .catch(() => {
          alert("failed to load data");
        });
    }
    return () => {};
  }, [isLoading]);

  return (
    <div style={{ marginTop: "24px" }}>
      <Table
        type="object-array"
        control
        defaultPageBy={50}
        data={!isLoading ? documentList : []}
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
            text: "시작",
            key: "period.start",
            textAlign: "center",
            type: "text",
            width: "120px",
          },
          {
            text: "끝",
            key: "period.end",
            type: "text",
            textAlign: "center",
            width: "120px",
          },
          {
            text: "상태",
            key: "isActivated",
            width: "120px",
            type: "status",
            status: {
              false: { text: "비활성화됨", color: "red" },
              true: { text: "활성화됨", color: "green" },
            },
            textAlign: "center",
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
            type: "button",
            key: "json",
            text: "다운로드",
            onClick: (e: any) => {
              getDocument(e._id).then((res) => {
                objectDownloadAsJson(res);
              });
            },
            width: "100px",
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
      {doc && editPopupActive && (
        <Popup
          closeBtn
          title={`${doc.schoolName}(${doc.schoolId}) / ${doc.year} ${doc.term}`}
          setState={setEditPopupActive}
          style={{
            maxWidth: "800px",
            width: "100%",
          }}
          contentScroll
        >
          <Tab
            dontUsePaths
            items={{
              "기본 정보": <Basic seasonData={doc} />,
              사용자: <User season={doc._id} />,
              교과목: <Subjects seasonData={doc} />,
              강의실: <Classroom seasonData={doc} />,
              양식: <Form seasonData={doc} />,
            }}
            align={"flex-start"}
          />
        </Popup>
      )}
    </div>
  );
};

export default Season;
