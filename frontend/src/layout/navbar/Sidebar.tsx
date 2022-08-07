import React, { useState } from "react";

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
import { INavLink, SidebarData } from "../../dummyData/SidebarData";
import { useSidebar } from "../../contexts/sidebarContext";

type Props = {};

const Sidebar = (props: Props) => {
  const [activeNavLink, setActiveNavLink] = useState<string>(
    SidebarData[0]?.title
  );

  const { sidebarClose, setSidebarClose } = useSidebar();

  const { currentUser } = useAuth();

  console.log(currentUser);

  function NavLinkClicked(name: string) {
    setActiveNavLink((prev: string | undefined) => {
      return name;
    });
  }

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
        {SidebarData.map((data: INavLink, index: number) => {
          return (
            <NavLink
              key={index}
              path={data.path}
              icon={data.icon}
              active={data.title === activeNavLink}
              handleClick={() => {
                NavLinkClicked(data.title);
              }}
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
      <NavProfile user={currentUser} />
    </Nav>
  );
};

export default Sidebar;
