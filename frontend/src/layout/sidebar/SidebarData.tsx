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
export const SidebarData = (
  auth: string,
  role?: string,
  currentPermission?: any
): any => {
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
            currentPermission?.permissionSyllabus
              ? {
                  title: "design",
                  name: "수업 개설",
                  path: "/courses/design",
                  icon: <Svg type="file" />,
                }
              : undefined,
            currentPermission?.permissionEnrollment
              ? {
                  title: "enroll",
                  name: "수강 신청",
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
          ].filter((element: any, i: number) => element !== undefined),
        },
      ]
    );
    if (currentRegistration.role === "teacher") {
      if (currentSchool?.formArchive) {
        data.push({
          title: "archive",
          name: "기록",
          path: "/archive",
          icon: <Svg type="edit" />,
          subLink: currentSchool.formArchive
            ?.filter(
              (form: any) =>
                form.authTeacher && form.authTeacher !== "undefined"
            )
            .map((val: any) => {
              return {
                title: val.label,
                name: val.label,
                path: `/archive/${val.label}`,
                icon: <Svg type="file" />,
              };
            }),
        });
      }
      data.push({
        title: "docs",
        name: "문서",
        path: "/docs",
        icon: <Svg type="docs" />,
      });
    } else if (currentRegistration.role === "student") {
      const myFormArchive = currentSchool.formArchive?.filter(
        (val: any, i: number) => val.authOptionStudentView
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
          name: "양식 관리",
          path: "/admin/forms",
          icon: <Svg type="file" />,
        },
      ],
    });
  } else if (auth === "admin") {
    data.push({
      title: "admin",
      name: "관리자",
      path: "/admin/schools/list",
      icon: <Svg type="school" />,
      subLink: [
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
          icon: <Svg type="user" />,
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

  return data;
};
