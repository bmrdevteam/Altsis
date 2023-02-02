/**
 * @file Academy Pid Page Tab Item - User
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
import { copyClipBoard } from "functions/functions";

// components
import Table from "components/tableV2/Table";
import Tab from "components/tab/Tab";
import Popup from "components/popup/Popup";

// popup/tab elements
import Basic from "./tab/Basic";

type Props = {};

const User = (props: Props) => {
  const database = useDatabase();
  const { pid: academyId = "" } = useParams<"pid">();
  const { school } = useParams<"school">();

  /* document list */
  const [documentList, setDocumentList] = useState<any>();
  const [doc, setDoc] = useState<any>();

  /* popup activation */
  const [editPopupActive, setEditPopupActive] = useState(false);

  async function getDocumentList() {
    const { users } = await database.R({
      location: `academies/${academyId}/users${
        school ? `?school=${school}` : ``
      }`,
    });
    return users;
  }

  async function getDocument(id: string) {
    const result = await database.R({
      location: `academies/${academyId}/users/${id}`,
    });
    return result;
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
    <>
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
              text: "등급",
              key: "auth",
              textAlign: "center",
              type: "status",
              status: {
                admin: { text: "관리자", color: "red" },
                manager: { text: "매니저", color: "purple" },
                member: { text: "멤버", color: "gray" },
              },
              width: "100px",
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
          ]}
        />
      </div>
      {editPopupActive && (
        <Popup
          closeBtn
          title={`${doc.userName}(${doc.userId})`}
          setState={setEditPopupActive}
          style={{
            borderRadius: "8px",
            maxWidth: "800px",
            width: "100%",
          }}
          contentScroll
        >
          <Tab
            dontUsePaths
            items={{
              "기본 정보": <Basic userData={doc} />,
            }}
            align={"flex-start"}
          />
        </Popup>
      )}
    </>
  );
};

export default User;
