/**
 * @file Academy Pid Page Tab Item - School
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
import { useAppNavigate } from "hooks/useAppNavigate";
import { copyClipBoard } from "functions/functions";

// components
import Table from "components/tableV2/Table";
import useAPIv2 from "hooks/useAPIv2";
type Props = {};

const School = (props: Props) => {
  const { AcademyAPI } = useAPIv2();
  const { pid: academyId = "" } = useParams<"pid">();
  const navigate = useAppNavigate();

  /* document list */
  const [documentList, setDocumentList] = useState<any>();

  async function getDocumentList() {
    const { documents } = await AcademyAPI.RAcademyDocuments({
      params: { academyId, docType: "schools" },
    });

    return documents;
  }

  useEffect(() => {
    getDocumentList().then((res) => {
      setDocumentList(res);
    });

    return () => {};
  }, []);

  return (
    <div>
      <div style={{ marginTop: "24px" }}>
        <Table
          type="object-array"
          control
          data={documentList || []}
          defaultPageBy={50}
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
              text: "자세히",
              key: "detail",
              type: "button",
              onClick: (e: any) => {
                navigate(e._id);
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
    </div>
  );
};

export default School;
