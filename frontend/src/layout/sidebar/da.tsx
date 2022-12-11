import { archiveTestData } from "archiveTest";
import { useAuth } from "contexts/authContext";
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
  const { currentUser } = useAuth();
  switch (auth) {
    case "owner":
      return [
        {
          title: "dashboard",
          name: " 대시보드",
          path: "/",
          icon: <Svg type="school" />,
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
          title: "dashboard",
          name: "대시보드",
          path: `${currentUser.academyId}`,
          icon: <Svg type="school" />,
        },
        {
          title: "courses",
          name: "수업",
          path: `${currentUser.academyId}/courses`,
          icon: <Svg type="bookOpen" />,
          subLink:
            role === "teacher"
              ? [
                  {
                    title: "design",
                    name: "수업개설",
                    path: `${currentUser.academyId}/courses/design`,
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "enroll",
                    name: "수강신청",
                    path: `${currentUser.academyId}/courses/enroll`,
                    icon: <Svg type="school" />,
                  },
                  {
                    title: "list",
                    name: "개설된 수업",
                    path: `${currentUser.academyId}/courses/list`,
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "mylist",
                    name: "개설한 수업",
                    path: `${currentUser.academyId}/courses/mylist`,
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "mentoring",
                    name: "멘토링 현황",
                    path: `${currentUser.academyId}/courses/mentoring`,
                    icon: <Svg type="file" />,
                  },
                ]
              : [
                  {
                    title: "design",
                    name: "수업개설",
                    path: `${currentUser.academyId}/courses/design`,
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "enroll",
                    name: "수강신청",
                    path: `${currentUser.academyId}/courses/enroll`,
                    icon: <Svg type="school" />,
                  },
                  {
                    title: "list",
                    name: "개설된 수업",
                    path: `${currentUser.academyId}/courses/list`,
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "mylist",
                    name: "개설한 수업",
                    path: `${currentUser.academyId}/courses/mylist`,
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "mentoring",
                    name: "멘토링 현황",
                    path: `${currentUser.academyId}/courses/mentoring`,
                    icon: <Svg type="file" />,
                  },
                ],
        },
        {
          title: "archive",
          name: "학생생활",
          path: `${currentUser.academyId}/courses/archive`,
          icon: <Svg type="bookOpen" />,
          subLink: archiveTestData.map((val) => {
            return {
              title: val.label,
              name: val.label,
              path: `/archive/${val.label}`,
              icon: <Svg type="file" />,
            };
          }),
        },
        {
          title: "admin",
          name: "관리자",
          path: `${currentUser.academyId}/courses/admin`,
          icon: <Svg type="calender" />,
          subLink: [
            {
              title: "schools",
              name: "학교 관리",
              path: `${currentUser.academyId}/courses/schools`,
              icon: <Svg type="file" />,
            },
            {
              title: "forms",
              name: "양식 관리",
              path: `${currentUser.academyId}/courses/forms`,
              icon: <Svg type="file" />,
            },
            {
              title: "users",
              name: "사용자",
              path: `${currentUser.academyId}/courses/users`,
              icon: <Svg type="file" />,
            },
            {
              title: "list",
              name: "리스트",
              path: `${currentUser.academyId}/courses/users/lists`,
              icon: <Svg type="file" />,
            },
          ],
        },
        {
          title: "myaccount",
          name: "내 정보",
          path: `${currentUser.academyId}/myaccount`,
          icon: <Svg type="gear" />,
        },
        {
          title: "settings",
          name: "설정",
          path: `${currentUser.academyId}/settings`,
          icon: <Svg type="gear" />,
        },
      ];

    default:
      return [
        {
          title: "dashboard",
          name: "대시보드",
          path: `${currentUser.academyId}`,
          icon: <Svg type="school" />,
        },
        {
          title: "courses",
          name: "수업",
          path: `${currentUser.academyId}/courses`,
          icon: <Svg type="bookOpen" />,
          subLink:
            role === "teacher"
              ? [
                  {
                    title: "design",
                    name: "수업개설",
                    path: `${currentUser.academyId}/courses/design`,
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "enroll",
                    name: "수강신청",
                    path: `${currentUser.academyId}/courses/enroll`,
                    icon: <Svg type="school" />,
                  },
                  {
                    title: "list",
                    name: "개설된 수업",
                    path: `${currentUser.academyId}/courses/list`,
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "mylist",
                    name: "개설한 수업",
                    path: `${currentUser.academyId}/courses/mylist`,
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "mentoring",
                    name: "멘토링 현황",
                    path: `${currentUser.academyId}/courses/mentoring`,
                    icon: <Svg type="file" />,
                  },
                ]
              : [
                  {
                    title: "design",
                    name: "수업개설",
                    path: `${currentUser.academeyId}/courses/design`,
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "enroll",
                    name: "수강신청",
                    path: `${currentUser.academeyId}/courses/enroll`,
                    icon: <Svg type="school" />,
                  },
                  {
                    title: "list",
                    name: "개설된 수업",
                    path: `${currentUser.academeyId}/courses/list`,
                    icon: <Svg type="file" />,
                  },
                  {
                    title: "mylist",
                    name: "개설한 수업",
                    path: `${currentUser.academeyId}/courses/mylist`,
                    icon: <Svg type="file" />,
                  },
                ],
        },
        {
          title: "myaccount",
          name: "내 정보",
          path: `${currentUser.academeyId}/myaccount`,
          icon: <Svg type="gear" />,
        },
        {
          title: "settings",
          name: "설정",
          path: `${currentUser.academeyId}/settings`,
          icon: <Svg type="gear" />,
        },
      ];
  }
};
