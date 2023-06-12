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

// tab elements
import _ from "lodash";
import useAPIv2 from "hooks/useAPIv2";

type Props = { season: string };

const Registration = (props: Props) => {
  const { AcademyAPI } = useAPIv2();
  const { pid: academyId = "" } = useParams<"pid">();

  /* document list */
  const [documentList, setDocumentList] = useState<any>();

  async function getDocumentList() {
    const { documents } = await AcademyAPI.RAcademyDocuments({
      params: { academyId, docType: "registrations" },
      query: { season: props.season },
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
            text: "역할",
            key: "role",
            textAlign: "center",
            type: "status",
            status: {
              teacher: { text: "선생님", color: "blue" },
              student: { text: "학생", color: "orange" },
            },
            width: "84px",
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
            text: "그룹",
            key: "group",
            type: "text",
            textAlign: "center",
          },
          {
            text: "담임 선생님",
            key: "teacherTxt",
            type: "text",
            textAlign: "center",
            whiteSpace: "pre-wrap",
          },
          {
            text: "부담임 선생님",
            key: "subTeacherTxt",
            type: "text",
            textAlign: "center",
            whiteSpace: "pre-wrap",
          },
        ]}
      />
    </div>
  );
};

export default Registration;
