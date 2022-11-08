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
export const SidebarData = (role: string): any => {
  switch (role) {
    case "manager":
    case "admin":
      return [
        {
          title: "dashboard",
          name: "대시보드",
          path: "/",
          icon: <Svg type="school" />,
        },
        {
          title: "enrollment",
          name: "수강신청",
          path: "/enrollment",
          icon: <Svg type="school" />,
        },
        {
          title: "courses/design",
          name: "수업 개설",
          path: "/courses/design",
          icon: <Svg type="bookOpen" />,
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
              name: "사용자",
              path: "/admin/users",
              icon: <Svg type="file" />,
            },
            {
              title: "list",
              name: "리스트",
              path: "/admin/lists",
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

    default:
      return [
        {
          title: "dashboard",
          name: "대시보드",
          path: "/",
          icon: <Svg type="school" />,
        },
        {
          title: "enrollment",
          name: "수강신청",
          path: "/enrollment",
          icon: <Svg type="school" />,
        },
        {
          title: "courses/design",
          name: "수업 개설",
          path: "/courses/design",
          icon: <Svg type="bookOpen" />,
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
