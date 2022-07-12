import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Svg from "../../../assets/svg/Svg";

import Nav, {
  NavLogo,
  NavLink,
  NavLinks,
  Search,
  NavProfile,
  SubLink,
  SubLinks,
} from "./sidebar.components";

type Props = {};

const Sidebar = (props: Props) => {
  const [activeNavLink, setActiveNavLink] = useState<string>();

  const navigate = useNavigate();

  function openSublinkClicked(name: string) {
    setActiveNavLink((prev: string | undefined) => {
      return prev !== name ? name : "";
    });
  }

  return (
    <Nav>
      <NavLogo>
        <h1>.Rename</h1>
      </NavLogo>
      <NavLinks>
        <Search />
        <NavLink
          name="Dashboard"
          handleClick={() => {
            openSublinkClicked("Dashboard");
          }}
          active={activeNavLink === "Dashboard"}
          icon={<Svg type="analyze" />}
          subLink={
            <SubLinks>
              <SubLink icon={<Svg type="file" />}>학생 관리</SubLink>
              <SubLink icon={<Svg type="calender" />}>학생 선택</SubLink>
              <SubLink icon={<Svg type="calender" />}>학생 추가</SubLink>
            </SubLinks>
          }
        >
          대시보드
        </NavLink>
        <NavLink icon={<Svg type="calender" />}>수업관리</NavLink>
        <NavLink icon={<Svg type="file" />}>수강신청</NavLink>
        <NavLink
          name="settings"
          handleClick={() => {
            openSublinkClicked("settings");
            navigate("settings", { replace: true });
          }}
          active={activeNavLink === "settings"}
          icon={<Svg type="school" />}
        >
          설정
        </NavLink>
      </NavLinks>
      <NavProfile />
    </Nav>
  );
};

export default Sidebar;
