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

// NavigationLinks component
import NavigationLinks from "components/navigationLinks/NavigationLinks";

// tab component
import Tab from "components/tab/Tab";

// tab elements
import BasicInfo from "./tab/BasicInfo/Index";
import User from "./tab/User/Index";
import Season from "./tab/Season/Index";
import School from "./tab/School/Index";
import Registration from "./tab/Registration/Index";

// import Setting from "./tab/Setting";
import Skeleton from "components/skeleton/Skeleton";

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
          setIsLoading(false);
        })
        .catch(() => {
          alert("failed to load data");
        });
    }
  }, [isLoading]);

  if (!isAcademy) {
    return <CannotFindAcademy />;
  }

  return (
    <div className={style.section}>
      <NavigationLinks />
      <div style={{ display: "flex", gap: "24px" }}>
        <div style={{ flex: "1 1 0" }}>
          <div className={style.title}>
            {academyData !== undefined ? (
              academyData.academyName
            ) : (
              <Skeleton height="22px" width="20%" />
            )}
          </div>
        </div>
      </div>

      {!isLoading ? (
        <Tab
          items={{
            아카데미: (
              <BasicInfo
                academyData={academyData}
                setAcademyData={setAcademyData}
              />
            ),
            학교: <School academyId={academyData?.academyId} />,
            학기: <Season academyId={academyData?.academyId} />,
            사용자: <User academyId={academyData?.academyId} />,
            등록: <Registration academyId={academyData?.academyId} />,
          }}
        />
      ) : (
        <div />
      )}
    </div>
  );
};

export default Academy;
