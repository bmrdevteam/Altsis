/**
 * @file User search result page
 *
 * @author yeonwu <yeonwu319@gmail.com>
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

import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";
import Navbar from "layout/navbar/Navbar";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Tab from "components/tab/Tab";
import ScheduleTab from "./tab/ScheduleTab";
import CoursesTab from "./tab/CoursesTab";
// import ArchiveTab from "./tab/ArchiveTab";
// import DocsTab from "./tab/DocsTab";
// import AppsTab from "./tab/AppsTab";
import UserInfo from "./UserInfo";

import style from "style/pages/userSearchResult/userSearchResult.module.scss";
import useAPIv2 from "hooks/useAPIv2";
import { TRegistration } from "types/registrations";

type Props = {};

type TUser = TRegistration & { profile?: string };

const UserSearchResult = (props: Props) => {
  const { currentRegistration } = useAuth();
  const { UserAPI, RegistrationAPI } = useAPIv2();

  const params = useParams();

  const [user, setUser] = useState<any>();

  // Find match registration
  useEffect(() => {
    if (currentRegistration && params?.uid) {
      const uid = params.uid;

      const getUser = async () => {
        try {
          const { registrations: rawRegistrations } =
            await RegistrationAPI.RRegistrations({
              query: {
                season: currentRegistration.season,
                user: uid,
              },
            });
          const { profile } = await UserAPI.RUserProfile({
            params: { _id: uid },
          });
          if (!rawRegistrations.length) {
            throw new Error("No such user");
          }
          const result: TUser = {
            ...rawRegistrations[0],
            _id: rawRegistrations[0].user,
          };
          result.profile = profile;
          return result;
        } catch (e) {}
      };

      getUser()
        .then((user) => {
          setUser(user);
        })
        .catch();
    }
  }, [currentRegistration, params]);

  let scheduleTab = <ScheduleTab user={user} />;
  let coursesTab = <CoursesTab user={user} />;
  // let archiveTab = <ArchiveTab user={user} />;
  // let docsTab = <DocsTab user={user} />;
  // let appsTab = <AppsTab user={user} />;

  function getAllowedTab() {
    if (!currentRegistration?.role) return {};
    let allowedTab: any = {};
    let allowedRoles;

    allowedRoles = ["admin", "teacher", "parents", "student"];
    if (allowedRoles.includes(currentRegistration.role)) {
      allowedTab.일정 = scheduleTab;
    }

    allowedRoles = ["admin", "teacher", "parents", "student"];
    if (allowedRoles.includes(currentRegistration.role)) {
      allowedTab.수업 = coursesTab;
    }

    // allowedRoles = ["admin", "teacher"];
    // if (allowedRoles.includes(currentRegistration.role)) {
    //   allowedTab.기록 = archiveTab;
    // }

    // allowedRoles = ["admin", "teacher"];
    // if (allowedRoles.includes(currentRegistration.role)) {
    //   allowedTab.문서 = docsTab;
    // }

    // allowedRoles = ["admin", "teacher", "parents", "student"];
    // if (allowedRoles.includes(currentRegistration.role)) {
    //   allowedTab.앱 = appsTab;
    // }

    return allowedTab;
  }

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.container}>
          {!user ? (
            <div className={style.user_not_found_msg}>
              {"해당 사용자를 찾지 못했습니다."}
            </div>
          ) : (
            <>
              <UserInfo user={user} />
              <Tab items={getAllowedTab()} />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UserSearchResult;
