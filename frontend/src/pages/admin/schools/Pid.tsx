/**
 * @file Schools Pid Page
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
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
import style from "style/pages/admin/schools.module.scss";

// components
import Tab from "components/tab/Tab";
import Skeleton from "components/skeleton/Skeleton";

// tab elements
import Dashboard from "./tab/Dashboard";
import Season from "./tab/seasons/Season";
import Archive from "./tab/archive/Index";
import User from "./tab/users/User";
import Links from "./tab/Links";
import Remove from "./tab/Remove";
import Notifications from "./tab/Notifications";
import BoardManagement from "./tab/BoardManagement";
import SchoolFeatureToggle from "./tab/FeatureSettings";

import { useAuth } from "contexts/authContext";
import useAPIv2 from "hooks/useAPIv2";
import { TSchool } from "types/schools";
import Loading from "components/loading/Loading";
import { TSeason } from "types/seasons";

type Props = {};

const CannotFindSchool = ({ schoolId }: { schoolId?: string }) => {
  const navigate = useAppNavigate();
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
        학교<strong>{schoolId}</strong>
        를 찾을 수 없습니다 <br />
        <span
          style={{ cursor: "pointer" }}
          onClick={() => {
            navigate("/academy/schools/add", { replace: true });
          }}
        >
          학교 추가하기
        </span>
      </div>
    </div>
  );
};

const School = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { SchoolAPI, SeasonAPI } = useAPIv2();
  const { currentUser, currentSchool } = useAuth();
  const navigate = useAppNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [schoolData, setSchoolData] = useState<TSchool>();
  const [seasonList, setSeasonList] = useState<TSeason[]>([]);
  const [isSchool, setIsSchool] = useState<boolean>(true);

  useEffect(() => {
    if (isLoading && pid) {
      if (currentUser.auth === "manager" && currentSchool._id !== pid) {
        return navigate("/admin/schools/" + currentSchool._id);
      }
      SchoolAPI.RSchool({ params: { _id: pid } })
        .then(({ school, academyFeatures }) => {
          setSchoolData({ ...school, academyFeatures });
          SeasonAPI.RSeasons({ query: { school: school._id } }).then(
            ({ seasons }) => {
              setSeasonList(seasons);
              setIsLoading(false);
            }
          );
        })
        .catch((err: any) => {
          setIsSchool(false);
        });
    }
  }, [isLoading, pid, currentSchool]);

  if (!isSchool) {
    return <CannotFindSchool />;
  }

  return !isLoading ? (
    <>
      <div className={style.section}>
        <div className={style.title}>
          {schoolData !== undefined ? (
            `${schoolData.schoolName} (${schoolData.schoolId})`
          ) : (
            <Skeleton height="22px" width="20%" />
          )}
        </div>
        {schoolData && (
          <Tab
            items={
              currentUser?.auth === "admin"
                ? {
                    학기: (
                      <Season
                        school={schoolData._id}
                        seasonList={seasonList}
                        setSeasonList={setSeasonList}
                      />
                    ),
                    기록: <Archive school={schoolData._id} />,
                    사용자: <User schoolData={schoolData} />,
                    알림: <Notifications />,
                    ...(schoolData.academyFeatures?.chatEnabled !== false
                      ? {
                          채팅: (
                            <SchoolFeatureToggle
                              featureKey="chatEnabled"
                              label="채팅 기능 활성화"
                              description="이 학교에서 실시간 채팅 기능을 활성화합니다."
                              schoolData={schoolData}
                              setSchoolData={setSchoolData}
                            />
                          ),
                        }
                      : {}),
                    ...(schoolData.academyFeatures?.boardEnabled !== false
                      ? {
                          보드: (
                            <BoardManagement
                              schoolData={schoolData}
                              setSchoolData={setSchoolData}
                            />
                          ),
                        }
                      : {}),
                    ...(schoolData.academyFeatures?.aiEnabled !== false
                      ? {
                          AI: (
                            <SchoolFeatureToggle
                              featureKey="aiEnabled"
                              label="AI 기능 활성화"
                              description="이 학교에서 AI 기능을 활성화합니다."
                              schoolData={schoolData}
                              setSchoolData={setSchoolData}
                            />
                          ),
                        }
                      : {}),
                    링크: (
                      <Links
                        schoolData={schoolData}
                        setSchoolData={setSchoolData}
                      />
                    ),
                    대시보드: (
                      <Dashboard schoolId={schoolData._id} />
                    ),
                    삭제: <Remove schoolData={schoolData} />,
                  }
                : {
                    학기: (
                      <Season
                        school={schoolData._id}
                        seasonList={seasonList}
                        setSeasonList={setSeasonList}
                      />
                    ),
                    기록: <Archive school={schoolData._id} />,
                    사용자: <User schoolData={schoolData} />,
                    알림: <Notifications />,
                    ...(schoolData.academyFeatures?.chatEnabled !== false
                      ? {
                          채팅: (
                            <SchoolFeatureToggle
                              featureKey="chatEnabled"
                              label="채팅 기능 활성화"
                              description="이 학교에서 실시간 채팅 기능을 활성화합니다."
                              schoolData={schoolData}
                              setSchoolData={setSchoolData}
                            />
                          ),
                        }
                      : {}),
                    ...(schoolData.academyFeatures?.boardEnabled !== false
                      ? {
                          보드: (
                            <BoardManagement
                              schoolData={schoolData}
                              setSchoolData={setSchoolData}
                            />
                          ),
                        }
                      : {}),
                    ...(schoolData.academyFeatures?.aiEnabled !== false
                      ? {
                          AI: (
                            <SchoolFeatureToggle
                              featureKey="aiEnabled"
                              label="AI 기능 활성화"
                              description="이 학교에서 AI 기능을 활성화합니다."
                              schoolData={schoolData}
                              setSchoolData={setSchoolData}
                            />
                          ),
                        }
                      : {}),
                    링크: (
                      <Links
                        schoolData={schoolData}
                        setSchoolData={setSchoolData}
                      />
                    ),
                    대시보드: (
                      <Dashboard schoolId={schoolData._id} />
                    ),
                  }
            }
          />
        )}
      </div>
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default School;
