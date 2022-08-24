import React, { ReactElement, useState } from "react";
import Svg from "../../assets/svg/Svg";
import style from "./sidebar.module.scss";
import dummmyProfilePic from "../../assets/img/sponge.jpeg";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import Popup from "../../components/popup/Popup";
import Button from "../../components/button/Button";

const Nav = ({
  children,
  close,
}: {
  children?: JSX.Element[] | JSX.Element;
  close: boolean;
}) => {
  return (
    <nav
      id="Sidebar"
      className={`${style.nav_container} ${close && style.close}`}
    >
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
  const navigate = useNavigate();
  return (
    <div className={style.nav_logo}>
      <span className={style.icon} onClick={handleClick}>
        {<Svg type="menu" width="24px" height="24px" />}
      </span>
      <div
        className={style.logo}
        onClick={() => {
          navigate("/", { replace: true });
        }}
      >
        {children}
      </div>
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

  path,
}: {
  children?: string;
  icon?: JSX.Element;
  active?: boolean;
  subLink?: JSX.Element[] | JSX.Element;

  path?: string;
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
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
}: {
  children?: string;
  icon?: JSX.Element;
  handleClick?: any;
  path?: string;
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
    <div className={style.sub_link_container}>
      <div
        className={style.sub_link}
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

  return (
    <>
      <div className={style.nav_profile_container}>
        <div className={style.nav_profile}>
          <div className={style.profile_img}>
            <img src={dummmyProfilePic} alt="profile" />
          </div>
          <div className={style.profile_info}>
            <div
              className={style.username}
              onClick={() => {
                currentUser?.userId
                  ? navigate("myaccount", { replace: true })
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
        <Popup setState={setLogoutPopupActive} title="로그아웃">
          <div style={{ margin: "24px 0" }}>
            <Button
              type="ghost"
              disableOnclick
              onClick={() => {
                fetch(`${process.env.REACT_APP_SERVER_URL}/api/users/logout`, {
                  credentials: "include",
                }).then(() => {
                  window.location.reload();
                  setLogoutPopupActive(false);
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
