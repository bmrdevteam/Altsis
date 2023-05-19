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

import { useLocation } from "react-router-dom";

type Props = {};

const Sidebar = (props: Props) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const { currentUser, currentRegistration } = useAuth();

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
                    active={
                      location.pathname !== "/" &&
                      data.title.includes(location.pathname.split("/")[1])
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
                                active={
                                  location.pathname !== "/" &&
                                  decodeURI(location.pathname).includes(
                                    sbData.path
                                  )
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
      <NavProfile />
    </Nav>
  );
};

export default Sidebar;
