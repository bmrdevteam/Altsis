/**
 * @file Search Page
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
 * -
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
import { useSearchParams } from "react-router-dom";

import Tab from "components/tab/Tab";
import ScheduleTab from "./tab/ScheduleTab";
import CoursesTab from "./tab/CoursesTab";
import ArchiveTab from "./tab/ArchiveTab";
import DocsTab from "./tab/DocsTab";
import AppsTab from "./tab/AppsTab";
import UserInfo from "./UserInfo";

import style from "style/pages/userSearchResult/userSearchResult.module.scss";

type Props = {};

const UserSearchResult = (props: Props) => {
  const {currentRegistration, currentSchool, currentSeason} = useAuth();
  const {RegistrationApi} = useApi();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [user, setUser] = useState<any>();
  const [tabItems, setTabItems] = useState<any>({});

  // Find match user
  useEffect(() => {
    if (currentSchool && currentSeason) {
      const query = searchParams.get('query');
      let userName: string = query ? query : '';

      RegistrationApi.RRegistrations({schoolId: currentSchool.schoolId, userName, season: currentSeason._id})
      .then((users) => {
        console.log(users);
        if (users) {
          setUser(users[0]);
        }
      })
      .catch(() => {

      })
    }

  }, [currentSchool, currentSeason, searchParams]);

  // Show only allowed tabs
  useEffect(() => {
    if (!user || !currentRegistration || !currentSeason) { return; }

    const currentUserRole = currentRegistration?.role;
    const newItemTabs = {...tabItems};

    // 구조가 반복되지만 newItemTabs.탭이름 을 설정 / 삭제해주어야 해서 함수로 뺴지 않았음.
    const scheduleAllowedRoles = ['admin', 'teacher', 'parents', 'student'];
    if (scheduleAllowedRoles.includes(currentUserRole)) {
      if (!newItemTabs.일정) { 
        newItemTabs.일정 = <ScheduleTab user={user}/>;
      }
    } else {
      delete newItemTabs.일정;
    }

    const courseAllowedRoles = ['admin', 'teacher', 'parents', 'student'];
    if (courseAllowedRoles.includes(currentUserRole)) {
      if (!newItemTabs.수업) { 
        newItemTabs.수업 = <CoursesTab user={user}/>;
      }
    } else {
      delete newItemTabs.수업;
    }

    const archiveAllowedRoles = ['admin', 'teacher'];
    if (archiveAllowedRoles.includes(currentUserRole)) {
      if (!newItemTabs.기록) { 
        newItemTabs.기록 = <ArchiveTab user={user}/>;
      }
    } else {
      delete newItemTabs.기록;
    }

    const docsAllowedRoles = ['admin', 'teacher'];
    if (docsAllowedRoles.includes(currentUserRole)) {
      if (!newItemTabs.문서) { 
        newItemTabs.문서 = <DocsTab user={user}/>;
      }
    } else {
      delete newItemTabs.문서;
    }

    const appsAllowedRoles = ['admin', 'teacher', 'parents', 'student'];
    if (appsAllowedRoles.includes(currentUserRole)) {
      if (!newItemTabs.앱) { 
        newItemTabs.앱 = <AppsTab user={user}/>;
      }
    } else {
      delete newItemTabs.앱;
    }

    setTabItems(newItemTabs);

  }, [currentRegistration, currentSeason, user]);

  return (
    <>
      <Navbar />
      <div className={style.container}>
        {(
          !user ? 
          <div className={style.user_not_found_msg}>{'해당 사용자를 찾지 못했습니다.'}</div> : 
          <>
            <UserInfo user={user}/>
            <Tab
              items={tabItems}
              dontUsePaths={true}
            />
          </>
        )}
      </div>
    </>
  );
};

export default UserSearchResult;
