import Svg from "../assets/svg/Svg";

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
export const SidebarData: any = [
  {
    title: "enrollment",
    name: "수강신청",
    path: "/enrollment",
    icon: <Svg type="school" />,
  },
  {
    title: "admin",
    name: "관리자",
    path: "/academy",
    icon: <Svg type="calender" />,
    subLink: [
      {
        title: "schools",
        name: "학교 관리",
        path: "/academy/schools",
        icon: <Svg type="file" />,
      },
      {
        title: "users",
        name: "사용자",
        path: "/academy/users",
        icon: <Svg type="file" />,
      },
    ],
  },
  {
    title: "school",
    name: "학교 관리",
    path: `/school/${"as"}`,
    icon: <Svg type="calender" />,
    subLink: [
      {
        title: "schools",
        name: "학교 관리",
        path: "/academy/schools",
        icon: <Svg type="file" />,
      },
      {
        title: "users",
        name: "사용자",
        path: "/academy/users",
        icon: <Svg type="file" />,
      },
    ],
  },
  {
    title: "setting",
    name: "설정",
    path: "/setting",
    icon: <Svg type="gear" />,
  },
];
