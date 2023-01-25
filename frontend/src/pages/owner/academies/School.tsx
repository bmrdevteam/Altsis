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
import { useNavigate, useParams } from "react-router-dom";
import useDatabase from "hooks/useDatabase";
import { copyClipBoard } from "functions/functions";
import style from "style/pages/admin/schools.module.scss";
// components
import Table from "components/tableV2/Table";
import Navbar from "layout/navbar/Navbar";
import Tab from "components/tab/Tab";
import Season from "./tab/Season/Index";
import User from "./tab/User/Index";
type Props = {};

const School = (props: Props) => {
  const database = useDatabase();
  const { pid: academyId = "" } = useParams<"pid">();
  const { school = "" } = useParams<"school">();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /* document list */
  const [schoolData, setSchoolData] = useState<any>();

  async function getDocument() {
    const result = await database.R({
      location: `academies/${academyId}/schools/${school}`,
    });
    return result;
  }

  useEffect(() => {
    if (isLoading) {
      getDocument()
        .then((res) => {
          setSchoolData(res);
        })
        .then(() => setIsLoading(false))
        .catch(() => {
          alert("failed to load data");
        });
    }

    return () => {};
  }, [isLoading]);

  return (
    <>
      <Navbar />

      <div className={style.section}>
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ flex: "1 1 0" }}>
            <div
              className={style.title}
              onClick={() => navigate(`/owner/academies/${academyId}#학교`)}
            >
              {`${academyId} / ${schoolData?.schoolName}(${schoolData?.schoolId})`}
            </div>
          </div>
        </div>

        {!isLoading ? (
          <>
            <Tab
              items={{
                학기: <Season />,
                사용자: <User />,
              }}
            />
          </>
        ) : (
          <></>
        )}
      </div>
    </>
  );
};

export default School;
