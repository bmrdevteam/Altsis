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
    case "admin" && "manager":
      return [
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
          ],
        },
        {
          title: "setting",
          name: "설정",
          path: "/settings",
          icon: <Svg type="gear" />,
        },
      ];

    default:
      return [
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
          title: "setting",
          name: "설정",
          path: "/settings",
          icon: <Svg type="gear" />,
        },
      ];
  }
};
