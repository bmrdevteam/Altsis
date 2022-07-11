import React, { ReactElement } from "react";
import Svg from "../../../assets/svg/Svg";
import style from "./sidebar.module.scss";
import dummmyProfilePic from "../../../assets/img/sponge.jpeg";

const Nav = ({ children }: { children?: JSX.Element[] | JSX.Element }) => {
  return <nav className={style.nav_container}>{children}</nav>;
};

const NavLogo = ({ children }: { children?: JSX.Element[] | JSX.Element }) => {
  return <div className={style.nav_logo}>{children}</div>;
};

const Search = ({setSearchRef}:{setSearchRef?:ReactElement}) => {
  return (
    <div className={style.search_container}>
      <div className={style.search}>
        <span className={style.icon}>{<Svg type="search" />}</span>
        <input
          onKeyDown={(e) => {
            e.key === "Enter" && console.log("sunbimasdf");
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
}: {
  children?: string;
  icon?: JSX.Element;
  active?: boolean;
  subLink?: JSX.Element[] | JSX.Element;
}) => {
  return (
    <div className={`${style.nav_link_container} ${active && style.active}`}>
      <div className={style.nav_link}>
        <span className={style.icon}>{icon}</span>
        <span className={style.name}>{children}</span>
      </div>
      {subLink}
    </div>
  );
};
const SubLinks = ({
  children,
  active,
}: {
  children: JSX.Element[] | JSX.Element;
  active?: boolean;
}) => {
  return (
    <div className={`${style.sub_links} ${active && style.active}`}>
      {children}
    </div>
  );
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

const NavProfile = () => {
  return (
    <div className={style.nav_profile_container}>
      <div className={style.nav_profile}>
        <div className={style.profile_img}>
          <img src={dummmyProfilePic} alt="profile" />
        </div>
        <div className={style.profile_info}>
          <div className={style.username}>Goind asdin</div>
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
