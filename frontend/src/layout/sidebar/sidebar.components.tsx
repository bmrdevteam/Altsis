import React, { ReactElement, useEffect, useState } from "react";
import Svg from "assets/svg/Svg";
import style from "./sidebar.module.scss";
import defaultProfilePic from "assets/img/default_profile.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

const Nav = ({
  children,
  open,
}: {
  children?: JSX.Element[] | JSX.Element;
  open: boolean;
}) => {
  return (
    <nav
      id="Sidebar"
      className={`${style.nav_container} ${open ? style.open : style.close}`}
    >
      {children}
    </nav>
  );
};

const NavLogo = ({ onClick }: { onClick: any }) => {
  const [open, setOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  const { currentUser, currentSchool, changeSchool } = useAuth();

  return (
    <div className={style.nav_logo}>
      <span className={style.icon} onClick={onClick}>
        {<Svg type="menu" width="24px" height="24px" />}
      </span>
      <select
        className={style.logo}
        style={{ border: "none", outline: "none", background: "transparent" }}
        name=""
        onChange={(e) => {
          changeSchool(e.target.value);
        }}
        id=""
        value={currentSchool?.school}
      >
        {currentUser.schools.map((s: any) => {
          return (
            <option key={s.school} value={s.school}>
              {s.schoolName}
            </option>
          );
        })}
      </select>
      {/* <div
        className={style.logo}
        onClick={() => {
          // navigate("/", { replace: true });
        }}
      >
        {currentSchool?.schoolName
          ? `${currentSchool.schoolName}`
          : currentUser?.academyName}
      </div>
      <div className={style.caret}>
        <Svg type={"caretDown"} />
      </div> */}
    </div>
  );
};

const Search = ({ setSearchRef }: { setSearchRef?: ReactElement }) => {
  return (
    <div className={style.search_container}>
      <div className={style.search}>
        <span className={style.icon}>{<Svg type="search" />}</span>

        <input
          // onKeyDown={(e) => {
          //   e.key === "Enter" && console.log("검색");
          // }}
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

  path,
  type,
}: {
  children?: string;
  icon?: JSX.Element;
  active?: boolean;
  subLink?: JSX.Element[] | JSX.Element;

  path?: string;
  type?: "default" | "link";
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return type === "default" ? (
    <div className={`${style.nav_link_container} ${active && style.active}`}>
      <div
        className={style.nav_link}
        onClick={() => {
          currentUser && path && navigate(path, { replace: true });
        }}
      >
        <span className={style.icon}>{icon}</span>
        <span className={style.name}>{children}</span>
      </div>
      {subLink}
    </div>
  ) : (
    <div className={`${style.nav_link_container} ${active && style.active}`}>
      <div
        className={style.nav_link}
        onClick={() => {
          window.open(path, "_blank", "noopener, noreferrer");
        }}
        title={path}
      >
        <span className={style.icon}>{icon}</span>
        <span className={style.name}>{children}</span>
      </div>
    </div>
  );
};
const SubLinks = ({ children }: { children: JSX.Element[] | JSX.Element }) => {
  return <div className={`${style.sub_links}`}>{children}</div>;
};

const SubLink = ({
  children,
  icon,
  handleClick,
  path,
  active,
}: {
  children?: string;
  icon?: JSX.Element;
  handleClick?: any;
  path?: string;
  active?: boolean;
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
    <div className={style.sub_link_container}>
      <div
        className={`${style.sub_link} ${active && style.active}`}
        onClick={() => {
          handleClick && handleClick();
          currentUser && path && navigate(path, { replace: true });
        }}
      >
        <div className={style.icon}>{icon}</div>
        <div className={style.name}>{children}</div>
      </div>
    </div>
  );
};

const NavProfile = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [logoutPopupActive, setLogoutPopupActive] = useState(false);
  const { UserAPI } = useAPIv2();

  return (
    <>
      <div className={style.nav_profile_container}>
        <div className={style.nav_profile}>
          <div className={style.profile_img}>
            <img
              src={currentUser?.profile || defaultProfilePic}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  currentUser?.profile?.replace("/thumb/", "/original/") ?? "";
              }}
              alt="profile"
              onClick={() => {
                currentUser?.userId
                  ? navigate("/settings", { replace: true })
                  : navigate("/login", { replace: true });
              }}
            />
          </div>
          <div className={style.profile_info}>
            <div
              className={style.username}
              onClick={() => {
                currentUser?.userId
                  ? navigate("/settings", { replace: true })
                  : navigate("/login", { replace: true });
              }}
            >
              {currentUser?.userName ?? "로그인"}
            </div>
            <div className={style.role}> {currentUser?.auth ?? ""}</div>
          </div>
          <div
            className={style.logout}
            onClick={() => {
              setLogoutPopupActive(true);
            }}
          >
            <Svg type="logout" width="18px" height="18px" />
          </div>
        </div>
      </div>
      {logoutPopupActive && (
        <Popup setState={setLogoutPopupActive} title="로그아웃" closeBtn>
          <div style={{ margin: "24px 0" }}>
            <Button
              type="ghost"
              disableOnclick
              onClick={() => {
                UserAPI.Logout()
                  .then(() => {
                    window.location.reload();
                    setLogoutPopupActive(false);
                  })
                  .catch((err: any) => {
                    ALERT_ERROR(err);
                    window.location.reload();
                  });
              }}
            >
              로그아웃
            </Button>
          </div>
        </Popup>
      )}
    </>
  );
};

export default Nav;
export { NavLogo, NavLinks, NavLink, Search, NavProfile, SubLink, SubLinks };
