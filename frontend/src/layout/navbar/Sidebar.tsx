import React from "react";

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
import { useSidebar } from "../../contexts/sidebarContext";
import { useLocation } from "react-router-dom";

type Props = {};

const Sidebar = (props: Props) => {
  const location = useLocation();

  const { sidebarClose, setSidebarClose } = useSidebar();

  const { currentUser } = useAuth();
  return (
    <Nav close={sidebarClose}>
      <NavLogo
        handleClick={() => {
          setSidebarClose((prev: boolean) => {
            return !prev;
          });
        }}
      >
        <h1>.Rename</h1>
      </NavLogo>
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
                    {data.subLink.map((data, index) => {
                      return (
                        <SubLink key={index} icon={data.icon} path={data.path}>
                          {data.name}
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
