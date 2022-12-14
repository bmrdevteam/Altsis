import { archiveTestData } from "archiveTest";
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";
import { useEffect, useState } from "react";
import Svg from "../../assets/svg/Svg";

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
export const SidebarData = (auth: string, role?: string): any => {
  const database = useDatabase();
  const { currentUser } = useAuth();
  const [archiveData, setArchiveData] = useState<any>();
  useEffect(() => {
    database.R({ location: "a" });
  }, []);

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
    case "admin":
      return [
        {
          title: "schedule",
          name: "일정",
          path: `/`,
          icon: <Svg type="calender" />,
        },
        {
          title: "courses",
          name: "수업",
          path: `/courses`,
          icon: <Svg type="bookOpen" />,
          subLink:
            role === "teacher"
              ? [
                  {
                    title: "design",
                    name: "수업개설",
                    path: "/courses/design",
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "enroll",
                    name: "수강신청",
                    path: "/courses/enroll",
                    icon: <Svg type="school" />,
                  },
                  {
                    title: "list",
                    name: "개설된 수업",
                    path: "/courses/list",
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "mylist",
                    name: "개설한 수업",
                    path: "/courses/mylist",
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "mentoring",
                    name: "멘토링 현황",
                    path: "/courses/mentoring",
                    icon: <Svg type="file" />,
                  },
                ]
              : [
                  {
                    title: "design",
                    name: "수업개설",
                    path: "/courses/design",
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "enroll",
                    name: "수강신청",
                    path: "/courses/enroll",
                    icon: <Svg type="school" />,
                  },
                  {
                    title: "list",
                    name: "개설된 수업",
                    path: "/courses/list",
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "mylist",
                    name: "개설한 수업",
                    path: "/courses/mylist",
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "mentoring",
                    name: "멘토링 현황",
                    path: "/courses/mentoring",
                    icon: <Svg type="file" />,
                  },
                ],
        },
        {
          title: "archive",
          name: "기록",
          path: `/archive`,
          icon: <Svg type="edit" />,
          subLink: archiveTestData.map((val, index) => {
            return {
              title: val.label,
              name: val.label,
              path: `/archive/${val.label}`,
              icon: <Svg type="file" />,
            };
          }),
        },

        {
          title: "myaccount",
          name: "내 정보",
          path: `/myaccount`,
          icon: <Svg type="gear" />,
        },
        {
          title: "settings",
          name: "설정",
          path: `/settings`,
          icon: <Svg type="gear" />,
        },
        {
          title: "admin",
          name: "관리자",
          path: `/admin`,
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
              name: "사용자",
              path: "/admin/users",
              icon: <Svg type="file" />,
            },
          ],
        },
      ];

    default:
      return [
        {
          title: "schedule",
          name: "일정",
          path: `/`,
          icon: <Svg type="calender" />,
        },
        {
          title: "courses",
          name: "수업",
          path: `/courses`,

          icon: <Svg type="bookOpen" />,
          subLink:
            role === "teacher"
              ? [
                  {
                    title: "design",
                    name: "수업개설",
                    path: "/courses/design",
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "enroll",
                    name: "수강신청",
                    path: "/courses/enroll",
                    icon: <Svg type="school" />,
                  },
                  {
                    title: "list",
                    name: "개설된 수업",
                    path: "/courses/list",
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "mylist",
                    name: "개설한 수업",
                    path: "/courses/mylist",
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "mentoring",
                    name: "멘토링 현황",
                    path: "/courses/mentoring",
                    icon: <Svg type="file" />,
                  },
                ]
              : [
                  {
                    title: "design",
                    name: "수업개설",
                    path: "/courses/design",
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "enroll",
                    name: "수강신청",
                    path: "/courses/enroll",
                    icon: <Svg type="school" />,
                  },
                  {
                    title: "list",
                    name: "개설된 수업",
                    path: "/courses/list",
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "mylist",
                    name: "개설한 수업",
                    path: "/courses/mylist",
                    icon: <Svg type="file" />,
                  },
                ],
        },
        {
          title: "myaccount",
          name: "내 정보",
          path: "/myaccount",
          icon: <Svg type="gear" />,
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
