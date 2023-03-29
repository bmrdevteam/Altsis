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
import { useNavigate, useParams } from "react-router-dom";
import useApi from "hooks/useApi";

import style from "style/pages/admin/schools.module.scss";

// tab component
import Tab from "components/tab/Tab";

// tab elements
import BasicInfo from "./tab/BasicInfo/Index";
import User from "./tab/User/Index";
import School from "./tab/School/Index";
import Backup from "./tab/Backup/Index";

// import Setting from "./tab/Setting";
import Skeleton from "components/skeleton/Skeleton";
import Navbar from "layout/navbar/Navbar";

type Props = {};

const CannotFindAcademy = ({ schoolId }: { schoolId?: string }) => {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
      }}
    >
      <div style={{ textAlign: "center" }}>
        아카데미<strong>{schoolId}</strong>
        를 찾을 수 없습니다 <br />
        <span
          style={{ cursor: "pointer" }}
          onClick={() => {
            navigate("/owner/academies", { replace: true });
          }}
        >
          아카데미 목록으로 돌아가기
        </span>
      </div>
    </div>
  );
};

const Academy = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { AcademyApi } = useApi();

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isAcademy, setIsAcademy] = useState<boolean>(true);
  const [academyData, setAcademyData] = useState<any>();

  useEffect(() => {
    if (isLoading) {
      AcademyApi.RAcademy({ academyId: pid })
        .then((res) => {
          setAcademyData(res);
        })
        .then(() => {
          setIsLoading(false);
        })
        .catch(() => {
          alert("failed to load data");
          setIsAcademy(false);
        });
    }
  }, [isLoading]);

  if (!isAcademy) {
    return <CannotFindAcademy />;
  }

  return (
    <>
      <Navbar />

      <div className={style.section}>
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ flex: "1 1 0" }}>
            <div className={style.title}>
              {academyData !== undefined ? (
                `${academyData.academyName}(${academyData.academyId})`
              ) : (
                <Skeleton height="22px" width="20%" />
              )}
            </div>
          </div>
        </div>

        {!isLoading ? (
          <>
            <Tab
              items={{
                아카데미: (
                  <BasicInfo
                    academyData={academyData}
                    setIsLoading={setIsLoading}
                  />
                ),
                학교: <School />,
                사용자: <User />,
                백업: <Backup />,
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

export default Academy;
