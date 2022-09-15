import React, { useEffect, useState } from "react";

import { useAuth } from "../../contexts/authContext";

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
  const [sidebarClose, setSidebarClose] = useState<boolean>(false);

  useEffect(() => {
    setSidebarClose(
      window.localStorage.getItem("AppSidebarStatus") === "close"
    );
    console.log(window.localStorage.getItem("AppSidebarStatus"));
  }, []);

  useEffect(() => {
    if (sidebarClose) {
      window.localStorage.setItem("AppSidebarStatus", "close");
    } else {
      window.localStorage.setItem("AppSidebarStatus", "open");
    }
  }, [sidebarClose]);

  const { currentUser, currentSchoolUser } = useAuth();

  return (
    <Nav close={sidebarClose}>
      <NavLogo
        onClick={() => {
          setSidebarClose((prev: boolean) => {
            return !prev;
          });
        }}
      />

      <NavLinks>
        <Search />

        {SidebarData(currentUser?.auth).map((data: INavLink, index: number) => {
          return (
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
                            location.pathname.includes(sbData.path)
                          }
                        >
                          {sbData.name}
                        </SubLink>
                      );
                    })}
                  </SubLinks>
                )
              }
            >
              {data.name}
            </NavLink>
          );
        })}
      </NavLinks>
      <NavProfile />
    </Nav>
  );
};

export default Sidebar;