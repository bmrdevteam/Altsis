/**
 * @file Academy Page
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
import { useNavigate } from "react-router-dom";
import useAPIv2 from "hooks/useAPIv2";

import style from "style/pages/owner/academy.module.scss";

// components
import Button from "components/button/Button";
import Divider from "components/divider/Divider";
import Table from "components/tableV2/Table";
import Navbar from "layout/navbar/Navbar";

import AddPopup from "./AddPopup";
import Loading from "components/loading/Loading";

type Props = {};

const Academies = (props: Props) => {
  const navigate = useNavigate();
  const { AcademyAPI } = useAPIv2();

  /* document list */
  const [academyList, setAcademyList] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* popup activation */
  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);

  useEffect(() => {
    if (isLoading) {
      AcademyAPI.RAcademies()
        .then(({ academies }) => {
          setAcademyList(academies);
          setIsLoading(false);
        })
        .catch((err) => {
          alert("failed to load data");
        });
    }
    return () => {};
  }, [isLoading]);

  return !isLoading ? (
    <>
      <Navbar />
      <div className={style.section}>
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ flex: "1 1 0" }}>
            <div className={style.title}>아카데미 목록</div>
          </div>
        </div>
        <Divider />
        <Button
          type={"ghost"}
          style={{
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
          onClick={() => {
            setAddPopupActive(true);
          }}
        >
          + 아카데미 생성
        </Button>
        <div style={{ marginTop: "24px" }}>
          <Table
            type="object-array"
            control
            data={academyList}
            defaultPageBy={10}
            header={[
              {
                text: "No",
                key: "tableRowIndex",
                type: "text",
                width: "48px",
                textAlign: "center",
              },
              {
                text: "아카데미 ID",
                key: "academyId",
                type: "text",
              },
              {
                text: "아카데미 이름",
                key: "academyName",
                type: "text",
              },
              {
                text: "관리자 ID",
                key: "adminId",
                type: "text",
              },
              {
                text: "관리자 이름",
                key: "adminName",
                type: "text",
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
                  navigate(`${e.academyId}`);
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
      {addPopupActive && (
        <AddPopup
          setPopupActive={setAddPopupActive}
          setIsLoading={setIsLoading}
        />
      )}
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default Academies;
