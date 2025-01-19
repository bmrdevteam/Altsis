import Svg from "../../assets/svg/Svg";
import { useAuth } from "contexts/authContext";

export interface INavLink {
  title: string;
  name: string;
  path?: string;
  icon: JSX.Element;
  subLink?: INavSubLink[];
  type?: "default" | "link";
}

interface INavSubLink {
  title: string;
  name: string;
  path: string;
  icon: JSX.Element;
}
export const SidebarData = (auth: string, role?: string): any => {
  const { currentRegistration, currentSchool } = useAuth();

  if (auth === "owner") {
    return [
      {
        title: "owner",
        name: "소유자",
        path: "/owner/academies",
        icon: <Svg type="school" />,
      },
    ];
  }

  const data = [];

  if (currentRegistration) {
    data.push(
      ...[
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
            currentRegistration?.permissionSyllabusV2
              ? {
                  title: "design",
                  name: "수업 개설",
                  path: "/courses/design",
                  icon: <Svg type="write" />,
                }
              : undefined,
            currentRegistration?.permissionEnrollmentV2
              ? {
                  title: "enroll",
                  name: "수강 신청",
                  path: "/courses/enroll",
                  icon: <Svg type="search" />,
                }
              : undefined,
              // currentRegistration?.permissionEnrollmentV2
              // ? {
              //   title: "enrollStatus",
              //   name: "수강 현황",
              //   path: "/courses/status",
              //   icon: <Svg type="profileList" />,
              // }
              // : undefined,
            {
              title: "list",
              name: "전체 목록",
              path: "/courses/list",
              icon: <Svg type="list" />,
            },
          ].filter((element: any, i: number) => element !== undefined),
        },
      ]
    );
    if (currentRegistration.role === "teacher") {
      if (currentSchool?.formArchive) {
        const formArchive = currentSchool.formArchive?.filter(
          (form: any) => form.authTeacher && form.authTeacher !== "undefined"
        );
        if (formArchive?.length > 0) {
          data.push({
            title: "archive",
            name: "기록",
            path: "/archive",
            icon: <Svg type="edit" />,
            subLink: formArchive.map((val: any) => {
              return {
                title: val.label,
                name: val.label,
                path: `/archive/${val.label}`,
                icon: <Svg type="file" />,
              };
            }),
          });
        }
      }
      data.push({
        title: "docs",
        name: "문서",
        path: "/docs",
        icon: <Svg type="docs" />,
      });
    } else if (currentRegistration.role === "student") {
      const myFormArchive = currentSchool?.formArchive?.filter(
        (form: any) => form.authStudent && form.authStudent !== "undefined"
      );
      if (myFormArchive?.length > 0) {
        data.push({
          title: "myArchive",
          name: "내 정보",
          path: "/myArchive",
          icon: <Svg type="profile" />,
          subLink: myFormArchive.map((val: any) => {
            return {
              title: val.label,
              name: val.label,
              path: `/myArchive/${val.label}`,
              icon: <Svg type="file" />,
            };
          }),
        });
      }
    }
  }

  if (auth === "manager") {
    data.push({
      title: "admin",
      name: "관리자",
      path: "/admin/schools/list",
      icon: <Svg type="school" />,
      subLink: [
        {
          title: "forms",
          name: "양식",
          path: "/admin/forms",
          icon: <Svg type="file" />,
        },
      ],
    });
  } else if (auth === "admin") {
    data.push({
      title: "admin",
      name: "아카데미 관리자",
      path: "/admin/schools/list",
      icon: <Svg type="school" />,
      subLink: [
        {
          title: "forms",
          name: "양식",
          path: "/admin/forms",
          icon: <Svg type="file" />,
        },
        {
          title: "users",
          name: "사용자",
          path: "/admin/users",
          icon: <Svg type="user" />,
        },
        {
          title: "backup",
          name: "백업 및 복구",
          path: "/admin/backup",
          icon: <Svg type="save" />,
        },
      ],
    });
  }

  if (currentSchool?.links) {
    data.push(
      ...currentSchool.links.map((link: { title: string; url: string }) => {
        return {
          type: "link",
          title: `link-${link.title}`,
          name: link.title,
          path: link.url,
          icon: <Svg type="linkExternal" />,
        };
      })
    );
  }

  data.push({
    title: "dev",
    name: "실험실",
    path: "/dev",
    icon: <Svg type="flask" />,
    subLink: [
      {
        title: "강의실",
        name: "강의실",
        path: "/dev/classrooms",
        icon: <Svg type="door-open" />,
      },
      {
        title: "일정",
        name: "일정",
        path: "/dev/schedule",
        icon: <Svg type="calender" />,
      },
    ],
  });

  return data;
};
