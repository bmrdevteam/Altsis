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
    title: "timeTable1",
    name: "시간표",
    path: "/timetable1",
    icon: <Svg type="calender" />,
    subLink: [
      {
        title: "sublink1",
        name: "서브 링크",
        path: "/timetable1/sublink",
        icon: <Svg type="file" />,
      },
    ],
  },
  {
    title: "timeTabkjle2",
    name: "시간표2",
    path: "/timetable2",
    icon: <Svg type="calender" />,
  },
  {
    title: "setting",
    name: "설정",
    path: "/setting",
    icon: <Svg type="gear" />,
  },
  {
    title: "tableExample",
    name: "Example",
    path: "/examples/table",
    icon: <Svg type="school" />,
  },
];
