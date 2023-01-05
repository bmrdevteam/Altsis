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

type Props = {};

const UserSearchResult = (props: Props) => {
  const {currentSchool} = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const {UserApi} = useApi();

  const [user, setUser] = useState<any>();

  // Find match user
  useEffect(() => {
    UserApi.RUsers({schoolId: currentSchool.schoolId})
    .then((users) => {
      const [user] = users.filter(((user: any) => user?.userName === searchParams.get('query')));
      setUser(user);
    })
    .catch(() => {
      alert('error');
    })
  }, [currentSchool]);

  return (
    <>
      <Navbar />
      <UserInfo user={user}/>
      <Tab
        items={{
          일정: <ScheduleTab user={user}/>,
          수업: <CoursesTab />,
          기록: <ArchiveTab />,
          문서: <DocsTab />,
          앱: <AppsTab />,
        }}
        dontUsePaths={true}
      />
      <div></div>
    </>
  );
};

export default UserSearchResult;
