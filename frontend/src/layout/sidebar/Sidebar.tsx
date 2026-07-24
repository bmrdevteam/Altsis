import React, { useEffect, useState } from "react";

import { useAuth } from "../../contexts/authContext";
import style from "./sidebar.module.scss";
import Nav, {
  NavLogo,
  NavLink,
  NavLinks,
  Search,
  NavProfile,
  SubLink,
  SubLinks,
} from "./sidebar.components";
import { INavLink, SidebarData } from "./SidebarData";
import useAPIv2 from "hooks/useAPIv2";

import { useLocation } from "react-router-dom";
import {
  getSchoolTodosCached,
  schoolTodosCacheKey,
} from "pages/boards/schoolTodosCache";

type Props = {};

const Sidebar = (props: Props) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const { currentUser, currentRegistration, currentSchool, currentSeason } =
    useAuth();
  const { AltSheetRowAPI } = useAPIv2();
  const [boardsTodoCount, setBoardsTodoCount] = useState(0);

  useEffect(() => {
    setSidebarOpen(window.localStorage.getItem("AppSidebarStatus") === "open");
  }, []);

  useEffect(() => {
    if (sidebarOpen) {
      window.localStorage.setItem("AppSidebarStatus", "open");
    } else {
      window.localStorage.setItem("AppSidebarStatus", "close");
    }
  }, [sidebarOpen]);

  const currentSeasonId =
    currentRegistration?.season || currentSeason?._id || undefined;

  // 보드 할 일 뱃지 (사이드바) — school/season 변경 시에만 (pathname마다 재호출하지 않음)
  useEffect(() => {
    if (
      !currentSchool?._id ||
      currentSchool.boardEnabled === false ||
      currentSchool.academyFeatures?.boardEnabled === false
    ) {
      setBoardsTodoCount(0);
      return;
    }
    let cancelled = false;
    const key = schoolTodosCacheKey(currentSchool._id, currentSeasonId);
    getSchoolTodosCached(key, () =>
      AltSheetRowAPI.RAltSheetRowSchoolTodos({
        query: {
          school: currentSchool._id,
          ...(currentSeasonId ? { season: currentSeasonId } : {}),
        },
      })
    )
      .then(({ count }) => {
        if (!cancelled) setBoardsTodoCount(count || 0);
      })
      .catch(() => {
        if (!cancelled) setBoardsTodoCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [currentSchool?._id, currentSeasonId]);

  return (
    <Nav open={sidebarOpen}>
      <NavLogo
        onClick={() => {
          setSidebarOpen((prev: boolean) => {
            return !prev;
          });
        }}
      />

      <div className={style.nav_links}>
        {/* <Search /> */}
        <div
          onClick={() => {
            if (window.innerWidth < 800) {
              setSidebarOpen(false);
            }
          }}
        >
          {SidebarData(currentUser?.auth, currentRegistration?.role).map(
            (data: INavLink, index: number) => {
              return (
                data && (
                  <NavLink
                    key={index}
                    path={data.path}
                    icon={data.icon}
                    badge={
                      data.title === "boards" ? boardsTodoCount : data.badge
                    }
                    active={
                      location.pathname.split("/")[3]
                        ? data.title.includes(location.pathname.split("/")[3]) ||
                          (data.matchPaths?.includes(
                            location.pathname.split("/")[3]
                          ) ?? false)
                        : data.path === "/"
                    }
                    subLink={
                      data.subLink && (
                        <SubLinks>
                          {data.subLink.map((sbData, index) => {
                            return (
                              <SubLink
                                key={index}
                                icon={sbData.icon}
                                path={sbData.path}
                                type={sbData.type}
                                active={
                                  !!location.pathname.split("/")[3] &&
                                  decodeURI(
                                    location.pathname.replace(
                                      /^\/[^/]+\/[^/]+/,
                                      ""
                                    )
                                  ).includes(sbData.path)
                                }
                              >
                                {sbData.name}
                              </SubLink>
                            );
                          })}
                        </SubLinks>
                      )
                    }
                    type={data.type ?? "default"}
                  >
                    {data.name}
                  </NavLink>
                )
              );
            }
          )}
        </div>
      </div>
      <NavProfile
        onNavigate={() => {
          if (window.innerWidth < 800) {
            setSidebarOpen(false);
          }
        }}
      />
    </Nav>
  );
};

export default Sidebar;
