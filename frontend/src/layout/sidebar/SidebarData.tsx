import { archiveTestData } from "archiveTest";
import { apps } from "apps";
import Svg from "../../assets/svg/Svg";
import { useAuth } from "contexts/authContext";
import { useEffect, useState } from "react";
import useApi from "hooks/useApi";

export interface INavLink {
  title: string;
  name: string;
  path?: string;
  icon: JSX.Element;
  subLink?: INavSubLink[];
}

interface INavSubLink {
  title: string;
  name: string;
  path: string;
  icon: JSX.Element;
}
export const SidebarData = (
  auth: string,
  role?: string,
  currentPermission?: any
): any => {
  const { currentSchool } = useAuth();


  switch (auth) {
    case "owner":
      return [
        {
          title: "schedule",
          name: "일정",
          path: "/",
          icon: <Svg type="calender" />,
        },
        {
          title: "owner",
          name: "소유자",
          path: "/owner",
          icon: <Svg type="school" />,
          subLink: [
            {
              title: "academies",
              name: "아카데미 관리",
              path: "/owner/academies",
              icon: <Svg type="file" />,
            },
          ],
        },
      ];
    case "manager":
      return [
        {
          title: "schedule",
          name: "일정",
          path: "/",
          icon: <Svg type="calender" />,
        },
        {
          title: "courses",
          name: "수업",
          path: "/courses",
          icon: <Svg type="bookOpen" />,
          subLink: [
            currentPermission?.permissionSyllabus
              ? {
                  title: "design",
                  name: "수업개설",
                  path: "/courses/design",
                  icon: <Svg type="file" />,
                }
              : undefined,
            currentPermission?.permissionSyllabus
              ? {
                  title: "mylist",
                  name: "나의 수업",
                  path: "/courses/mylist",
                  icon: <Svg type="file" />,
                }
              : undefined,
            currentPermission?.permissionEnrollment
              ? {
                  title: "enroll",
                  name: "수강신청",
                  path: "/courses/enroll",
                  icon: <Svg type="school" />,
                }
              : undefined,
            {
              title: "list",
              name: "수업 목록",
              path: "/courses/list",
              icon: <Svg type="file" />,
            },

            role === "teacher"
              ? {
                  title: "mentoring",
                  name: "담당 수업",
                  path: "/courses/mentoring",
                  icon: <Svg type="file" />,
                }
              : undefined,
          ].filter((element: any, i: number) => element !== undefined),
        },
        {
          title: "archive",
          name: "기록",
          path: "/archive",
          icon: <Svg type="edit" />,
          subLink: currentSchool.formArchive?.map((val: any) => {
            return {
              title: val.label,
              name: val.label,
              path: `/archive/${val.label}`,
              icon: <Svg type="file" />,
            };
          }),
        },
        {
          title: "docs",
          name: "문서",
          path: "/docs",
          icon: <Svg type="docs" />,
        },
        {
          title: "apps",
          name: "앱",
          path: "/apps",
          icon: <Svg type="app_menu" />,
          subLink: [
            {
              title: "classroom",
              name: "강의실",
              path: "/apps/apps",
              icon: <Svg type="app" />,
            },
          ],
        },
        {
          title: "admin",
          name: "관리자",
          path: "/admin",
          icon: <Svg type="calender" />,
          subLink: [
            {
              title: "schools",
              name: "학교 관리",
              path: "/admin/schools",
              icon: <Svg type="file" />,
            },
            {
              title: "forms",
              name: "양식 관리",
              path: "/admin/forms",
              icon: <Svg type="file" />,
            },
          ],
        },
        {
          title: "notifications",
          name: "알림",
          path: "/notifications",
          icon: <Svg type="notification" />,
        },
        // {
        //   title: "myaccount",
        //   name: "내 정보",
        //   path: "/myaccount",
        //   icon: <Svg type="gear" />,
        // },
        {
          title: "settings",
          name: "설정",
          path: "/settings",
          icon: <Svg type="gear" />,
        },
      ];
    case "admin":
      return [
        {
          title: "schedule",
          name: "일정",
          path: "/",
          icon: <Svg type="calender" />,
        },
        {
          title: "courses",
          name: "수업",
          path: "/courses",
          icon: <Svg type="bookOpen" />,
          subLink: [
            currentPermission?.permissionSyllabus
              ? {
                  title: "design",
                  name: "수업개설",
                  path: "/courses/design",
                  icon: <Svg type="file" />,
                }
              : undefined,
            currentPermission?.permissionSyllabus
              ? {
                  title: "mylist",
                  name: "나의 수업",
                  path: "/courses/mylist",
                  icon: <Svg type="file" />,
                }
              : undefined,
            currentPermission?.permissionEnrollment
              ? {
                  title: "enroll",
                  name: "수강신청",
                  path: "/courses/enroll",
                  icon: <Svg type="school" />,
                }
              : undefined,
            {
              title: "list",
              name: "수업 목록",
              path: "/courses/list",
              icon: <Svg type="file" />,
            },

            role === "teacher"
              ? {
                  title: "mentoring",
                  name: "담당 수업",
                  path: "/courses/mentoring",
                  icon: <Svg type="file" />,
                }
              : undefined,
          ].filter((element: any, i: number) => element !== undefined),
        },
        {
          title: "archive",
          name: "기록",
          path: "/archive",
          icon: <Svg type="edit" />,
          subLink: currentSchool.formArchive?.map((val:any) => {
            return {
              title: val.label,
              name: val.label,
              path: `/archive/${val.label}`,
              icon: <Svg type="file" />,
            };
          }),
        },
        {
          title: "docs",
          name: "문서",
          path: "/docs",
          icon: <Svg type="docs" />,
        },
        {
          title: "apps",
          name: "앱",
          path: "/apps",
          icon: <Svg type="app_menu" />,
          subLink: [
            {
              title: "classroom",
              name: "강의실",
              path: "/apps/apps",
              icon: <Svg type="app" />,
            },
          ],
        },
        {
          title: "admin",
          name: "관리자",
          path: "/admin",
          icon: <Svg type="calender" />,
          subLink: [
            {
              title: "schools",
              name: "학교 관리",
              path: "/admin/schools",
              icon: <Svg type="file" />,
            },
            {
              title: "forms",
              name: "양식 관리",
              path: "/admin/forms",
              icon: <Svg type="file" />,
            },
            {
              title: "users",
              name: "사용자 관리",
              path: "/admin/users",
              icon: <Svg type="file" />,
            },
          ],
        },
        {
          title: "notifications",
          name: "알림",
          path: "/notifications",
          icon: <Svg type="notification" />,
        },
        // {
        //   title: "myaccount",
        //   name: "내 정보",
        //   path: "/myaccount",
        //   icon: <Svg type="gear" />,
        // },
        // {
        //   title: "settings",
        //   name: "설정",
        //   path: "/settings",
        //   icon: <Svg type="gear" />,
        // },
      ];

    default:
      return [
        {
          title: "schedule",
          name: "일정",
          path: "/",
          icon: <Svg type="calender" />,
        },
        {
          title: "courses",
          name: "수업",
          path: "/courses",
          icon: <Svg type="bookOpen" />,
          subLink: [
            currentPermission?.permissionSyllabus
              ? {
                  title: "design",
                  name: "수업개설",
                  path: "/courses/design",
                  icon: <Svg type="file" />,
                }
              : undefined,
            currentPermission?.permissionSyllabus
              ? {
                  title: "mylist",
                  name: "나의 수업",
                  path: "/courses/mylist",
                  icon: <Svg type="file" />,
                }
              : undefined,
            currentPermission?.permissionEnrollment
              ? {
                  title: "enroll",
                  name: "수강신청",
                  path: "/courses/enroll",
                  icon: <Svg type="school" />,
                }
              : undefined,
            {
              title: "list",
              name: "수업 목록",
              path: "/courses/list",
              icon: <Svg type="file" />,
            },

            role === "teacher"
              ? {
                  title: "mentoring",
                  name: "담당 수업",
                  path: "/courses/mentoring",
                  icon: <Svg type="file" />,
                }
              : undefined,
          ].filter((element: any, i: number) => element !== undefined),
        },
        // {
        //   title: "myaccount",
        //   name: "내 정보",
        //   path: "/myaccount",
        //   icon: <Svg type="gear" />,
        // },
        {
          title: "notifications",
          name: "알림",
          path: "/notifications",
          icon: <Svg type="notification" />,
        },
        {
          title: "settings",
          name: "설정",
          path: "/settings",
          icon: <Svg type="gear" />,
        },
      ];
  }
};
