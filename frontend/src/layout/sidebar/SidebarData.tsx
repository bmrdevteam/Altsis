import Svg from "../../assets/svg/Svg";
import { useAuth } from "contexts/authContext";

export interface INavLink {
  title: string;
  name: string;
  path?: string;
  icon: JSX.Element;
  subLink?: INavSubLink[];
  type?: "default" | "link";
  matchPaths?: string[];
  /** 사이드바 뱃지 숫자 (0 이하면 숨김) */
  badge?: number;
}

export interface INavSubLink {
  title: string;
  name: string;
  path: string;
  icon: JSX.Element;
  type?: "default" | "link";
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
          icon: <Svg type="eventCalendar" />,
        },
        {
          title: "courses",
          name: "수업",
          path: "/courses",
          icon: <Svg type="menuBook" />,
          subLink: [
            currentRegistration?.permissionSyllabusV2
              ? {
                  title: "design",
                  name: "수업 개설",
                  path: "/courses/design",
                  icon: <Svg type="postAdd" />,
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
            {
              title: "classrooms",
              name: "강의실 현황",
              path: "/courses/classrooms",
              icon: <Svg type="meetingRoom" />,
            },
          ].filter((element: any, i: number) => element !== undefined),
        },
      ]
    );
    if (currentRegistration.role === "teacher") {
      if (currentSchool?.formArchive) {
        const isManager = auth === "manager";
        const formArchive = currentSchool.formArchive?.filter(
          (form: any) =>
            (form.authTeacher && form.authTeacher !== "undefined") ||
            (isManager && form.authManager === "viewAndEdit")
        );
        if (formArchive?.length > 0) {
          data.push({
            title: "archive",
            name: "기록",
            path: "/archive",
            icon: <Svg type="editNote" />,
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
    } else if (currentRegistration.role === "student") {
      const myFormArchive = currentSchool?.formArchive?.filter(
        (form: any) => form.authStudent && form.authStudent !== "undefined"
      );
      if (myFormArchive?.length > 0) {
        data.push({
          title: "myArchive",
          name: "기록",
          path: "/myArchive",
          icon: <Svg type="editNote" />,
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
      // 관리자이면서 학생인 경우, 관리자 권한이 있는 기록도 표시
      if (auth === "manager" && currentSchool?.formArchive) {
        const managerFormArchive = currentSchool.formArchive?.filter(
          (form: any) => form.authManager === "viewAndEdit"
        );
        if (managerFormArchive?.length > 0) {
          data.push({
            title: "archive",
            name: "기록",
            path: "/archive",
            icon: <Svg type="editNote" />,
            subLink: managerFormArchive.map((val: any) => {
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
    }
    data.push({
      title: "docs",
      name: "문서",
      path: "/docs",
      icon: <Svg type="article" />,
    });
    if (
      currentSchool?.boardEnabled !== false &&
      currentSchool?.academyFeatures?.boardEnabled !== false
    ) {
      data.push({
        title: "boards",
        name: "보드",
        path: "/boards",
        icon: <Svg type="dashboard" />,
        matchPaths: ["boards"],
      });
    }
  }

  if (auth === "manager") {
    data.push({
      title: "admin",
      name: "관리",
      path: "/admin/schools/list",
      icon: <Svg type="adminSettings" />,
      matchPaths: ["admin", "forms"],
      subLink: [
        {
          title: "forms",
          name: "양식",
          path: "/forms",
          icon: <Svg type="description" />,
        },
      ],
    });
  } else if (auth === "admin") {
    data.push({
      title: "admin",
      name: "아카데미 관리자",
      path: "/admin/schools/list",
      icon: <Svg type="adminSettings" />,
      matchPaths: ["admin", "forms"],
      subLink: [
        {
          title: "forms",
          name: "양식",
          path: "/forms",
          icon: <Svg type="description" />,
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

  if (currentSchool?.links && currentSchool.links.length > 0) {
    data.push({
      title: "links",
      name: "링크",
      icon: <Svg type="openInNew" />,
      subLink: currentSchool.links.map(
        (link: { title: string; url: string }) => ({
          title: `link-${link.title}`,
          name: link.title,
          path: link.url,
          icon: <Svg type="openInNew" />,
          type: "link" as const,
        })
      ),
    });
  }

  return data;
};
