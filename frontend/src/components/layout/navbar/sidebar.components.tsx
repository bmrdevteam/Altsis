import React, { ReactElement } from "react";
import Svg from "../../../assets/svg/Svg";
import style from "./sidebar.module.scss";
import dummmyProfilePic from "../../../assets/img/sponge.jpeg";
import { useNavigate } from "react-router-dom";

const Nav = ({
  children,
  close,
}: {
  children?: JSX.Element[] | JSX.Element;
  close: boolean;
}) => {
  return (
    <nav className={`${style.nav_container} ${close && style.close}`}>
      {children}
    </nav>
  );
};

const NavLogo = ({
  children,
  handleClick,
}: {
  children?: JSX.Element[] | JSX.Element;
  handleClick: any;
}) => {
  return (
    <div className={style.nav_logo}>
      <span className={style.icon} onClick={handleClick}>
        {<Svg type="menu" width="24px" height="24px" />}
      </span>
      <div className={style.logo}>{children}</div>
    </div>
  );
};

const Search = ({ setSearchRef }: { setSearchRef?: ReactElement }) => {
  return (
    <div className={style.search_container}>
      <div className={style.search}>
        <span className={style.icon}>{<Svg type="search" />}</span>

          <input
            onKeyDown={(e) => {
              e.key === "Enter" && console.log("검색");
            }}
            className={style.search_input}
            placeholder="검색"
          />

      </div>
    </div>
  );
};

const NavLinks = ({ children }: { children?: JSX.Element[] | JSX.Element }) => {
  return <div className={style.nav_links}>{children}</div>;
};

const NavLink = ({
  children,
  icon,
  active,
  subLink,
  handleClick,
  path,
}: {
  children?: string;
  icon?: JSX.Element;
  active?: boolean;
  subLink?: JSX.Element[] | JSX.Element;
  handleClick?: any;
  path?: string;
}) => {
  const navigate = useNavigate();

  return (
    <div className={`${style.nav_link_container} ${active && style.active}`}>
      <div
        className={style.nav_link}
        onClick={() => {
          handleClick();
          path && navigate(path, { replace: true });
        }}
      >
        <span className={style.icon}>{icon}</span>
        <span className={style.name}>{children}</span>
      </div>
      {subLink}
    </div>
  );
};
const SubLinks = ({ children }: { children: JSX.Element[] | JSX.Element }) => {
  return <div className={`${style.sub_links}`}>{children}</div>;
};

const SubLink = ({
  children,
  icon,
}: {
  children?: string;
  icon?: JSX.Element;
}) => {
  return (
    <div className={style.sub_link_container}>
      <div className={style.sub_link}>
        <div className={style.icon}>{icon}</div>
        <div className={style.name}>{children}</div>
      </div>
    </div>
  );
};

const NavProfile = ({ user }: { user: any }) => {
  return (
    <div className={style.nav_profile_container}>
      <div className={style.nav_profile}>
        <div className={style.profile_img}>
          <img src={dummmyProfilePic} alt="profile" />
        </div>
        <div className={style.profile_info}>
          <div className={style.username}>{user?.userId ?? "로그인"}</div>
          <div className={style.role}>관리자</div>
        </div>
        <div className={style.logout}>
          <Svg type="logout" width="18px" height="18px" />
        </div>
      </div>
    </div>
  );
};

export default Nav;
export { NavLogo, NavLinks, NavLink, Search, NavProfile, SubLink, SubLinks };
