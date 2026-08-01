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
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import _ from "lodash";

import Tab from "components/tab/Tab";
import ScheduleTab from "./tab/ScheduleTab";
import CoursesTab from "./tab/CoursesTab";
import UserInfo from "./UserInfo";

import style from "style/pages/userSearchResult/userSearchResult.module.scss";
import useAPIv2 from "hooks/useAPIv2";
import { TRegistration } from "types/registrations";

type Props = {};

type TUser = TRegistration & { profile?: string };

type TCourseLists = {
  enrolled: any[];
  created: any[];
  mentoring: any[];
};

const UserSearchResult = (props: Props) => {
  const { currentRegistration } = useAuth();
  const { UserAPI, RegistrationAPI, SyllabusAPI } = useAPIv2();

  const params = useParams();
  const uid = params?.uid;
  const seasonId = currentRegistration?.season
    ? String(currentRegistration.season)
    : "";

  const [user, setUser] = useState<TUser>();
  const [userLoading, setUserLoading] = useState(true);
  const [courseLists, setCourseLists] = useState<TCourseLists>({
    enrolled: [],
    created: [],
    mentoring: [],
  });
  const [coursesLoaded, setCoursesLoaded] = useState(false);

  const userId = user?._id != null ? String(user._id) : "";

  // Find match registration
  useEffect(() => {
    if (!seasonId || !uid) {
      setUser(undefined);
      setUserLoading(false);
      return;
    }

    let cancelled = false;
    setUserLoading(true);
    setUser(undefined);
    setCoursesLoaded(false);
    setCourseLists({ enrolled: [], created: [], mentoring: [] });

    (async () => {
      try {
        const { registrations: rawRegistrations } =
          await RegistrationAPI.RRegistrations({
            query: {
              season: seasonId,
              user: uid,
            },
          });
        const { profile } = await UserAPI.RUserProfile({
          params: { _id: uid },
        });
        if (!rawRegistrations.length) {
          throw new Error("No such user");
        }
        if (cancelled) return;
        setUser({
          ...rawRegistrations[0],
          _id: String(rawRegistrations[0].user),
          profile,
        });
      } catch {
        if (!cancelled) setUser(undefined);
      } finally {
        if (!cancelled) setUserLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seasonId, uid]);

  // Course counts for conditional tabs
  useEffect(() => {
    if (!seasonId || !userId) return;

    let cancelled = false;
    setCoursesLoaded(false);

    (async () => {
      try {
        const [
          { enrollments: enrolled, syllabuses: syllabusesEnrolled },
          { syllabuses: created },
          { syllabuses: mentoring },
        ] = await Promise.all([
          SyllabusAPI.RSyllabuses({
            query: { season: seasonId, student: userId },
          }),
          SyllabusAPI.RSyllabuses({
            query: { season: seasonId, user: userId },
          }),
          SyllabusAPI.RSyllabuses({
            query: { season: seasonId, teacher: userId },
          }),
        ]);

        const enrolledList = enrolled ?? [];
        for (const syllabus of syllabusesEnrolled ?? []) {
          const idx = _.findIndex(enrolledList, { syllabus: syllabus._id });
          if (idx !== -1) {
            enrolledList[idx].count = syllabus.count;
            enrolledList[idx]._id = syllabus._id;
          }
        }

        if (cancelled) return;
        setCourseLists({
          enrolled: enrolledList,
          created: created ?? [],
          mentoring: mentoring ?? [],
        });
      } catch {
        if (!cancelled) {
          setCourseLists({ enrolled: [], created: [], mentoring: [] });
        }
      } finally {
        if (!cancelled) setCoursesLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seasonId, userId]);

  const tabItems = useMemo(() => {
    if (!currentRegistration?.role || !user) return null;

    const allowedRoles = ["admin", "teacher", "parents", "student"];
    if (!allowedRoles.includes(currentRegistration.role)) return {};

    const courseProps = {
      user,
      enrolledCourseList: courseLists.enrolled,
      createdCourseList: courseLists.created,
      mentoringCourseList: courseLists.mentoring,
    };

    const items: Record<string, JSX.Element> = {
      일정: <ScheduleTab user={user} />,
      시간표: <CoursesTab {...courseProps} view="timeTable" />,
    };

    if (coursesLoaded) {
      if (courseLists.enrolled.length > 0) {
        items["수강 현황"] = (
          <CoursesTab {...courseProps} view="enrollments" />
        );
      }
      if (courseLists.created.length > 0) {
        items["개설 수업"] = <CoursesTab {...courseProps} view="myDesgins" />;
      }
      if (courseLists.mentoring.length > 0) {
        items["담당 수업"] = <CoursesTab {...courseProps} view="mentoring" />;
      }
    }

    return items;
  }, [
    currentRegistration?.role,
    user,
    coursesLoaded,
    courseLists.enrolled,
    courseLists.created,
    courseLists.mentoring,
  ]);

  return (
    <>
      <div className={style.section}>
        <div className={style.container}>
          {userLoading ? (
            <div className={style.user_not_found_msg}>불러오는 중…</div>
          ) : !user || !tabItems ? (
            <div className={style.user_not_found_msg}>
              해당 사용자를 찾지 못했습니다.
            </div>
          ) : (
            <Tab
              key={`${userId}|${Object.keys(tabItems).join("|")}`}
              headerStart={<UserInfo user={user} />}
              align="flex-end"
              items={tabItems}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default UserSearchResult;
