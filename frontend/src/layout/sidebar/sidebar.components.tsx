import React, { ReactElement, useEffect, useState } from "react";
import Svg from "assets/svg/Svg";
import style from "./sidebar.module.scss";
import defaultProfilePic from "assets/img/default_profile.png";
import { useAuth } from "contexts/authContext";
import { useAppNavigate } from "hooks/useAppNavigate";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { clearAuthClientCookies } from "utils/authCookies";
import { useCookies } from "react-cookie";

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
  const navigate = useAppNavigate();

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
          const selectedSchoolId = e.target.value;
          const selectedSchool = currentUser.schools.find(
            (s: any) => s.schoolId === selectedSchoolId
          );
          if (selectedSchool) {
            changeSchool(selectedSchool.school);
            navigate(`/${currentUser.academyId}/${selectedSchoolId}/`, {
              replace: true,
            });
          }
        }}
        id=""
        value={currentSchool?.schoolId}
      >
        {currentUser.schools.map((s: any) => {
          return (
            <option key={s.school} value={s.schoolId}>
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
  badge,
}: {
  children?: string;
  icon?: JSX.Element;
  active?: boolean;
  subLink?: JSX.Element[] | JSX.Element;
  path?: string;
  type?: "default" | "link";
  badge?: number;
}) => {
  const navigate = useAppNavigate();
  const { currentUser } = useAuth();
  const [expanded, setExpanded] = useState<boolean | null>(null);

  // expanded가 null이면 active 상태를 따름, 아니면 수동 토글 값 사용
  const isExpanded = expanded !== null ? expanded : !!active;

  useEffect(() => {
    // active 상태 변경 시 수동 토글 초기화
    setExpanded(null);
  }, [active]);

  const badgeEl =
    badge != null && badge > 0 ? (
      <span className={style.nav_badge} title={`할 일 ${badge}건`}>
        {badge > 99 ? "99+" : badge}
      </span>
    ) : null;

  return type === "default" ? (
    <div
      className={`${style.nav_link_container} ${active && style.active} ${
        subLink && isExpanded ? style.expanded : ""
      }`}
    >
      <div
        className={style.nav_link}
        onClick={() => {
          if (subLink) {
            setExpanded((prev) => (prev !== null ? !prev : !active));
          }
          currentUser && path && navigate(path, { replace: true });
        }}
      >
        <span className={style.icon}>
          {icon}
          {badgeEl && <span className={style.nav_badge_dot} aria-hidden />}
        </span>
        <span className={style.name}>{children}</span>
        {badgeEl}
        {subLink && (
          <span
            className={`${style.chevron} ${isExpanded ? style.chevron_open : ""}`}
          >
            <Svg type="chevronDown" width="14px" height="14px" />
          </span>
        )}
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
        {badgeEl}
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
  type,
}: {
  children?: string;
  icon?: JSX.Element;
  handleClick?: any;
  path?: string;
  active?: boolean;
  type?: "default" | "link";
}) => {
  const navigate = useAppNavigate();
  const { currentUser } = useAuth();

  return (
    <div className={style.sub_link_container}>
      <div
        className={`${style.sub_link} ${active && style.active}`}
        onClick={() => {
          handleClick && handleClick();
          if (type === "link") {
            window.open(path, "_blank", "noopener, noreferrer");
          } else {
            currentUser && path && navigate(path, { replace: true });
          }
        }}
        title={type === "link" ? path : undefined}
      >
        <div className={style.icon}>{icon}</div>
        <div className={style.name}>{children}</div>
      </div>
    </div>
  );
};

const NavProfile = ({ onNavigate }: { onNavigate?: () => void }) => {
  const navigate = useAppNavigate();
  const { currentUser } = useAuth();
  const [logoutPopupActive, setLogoutPopupActive] = useState(false);
  const { UserAPI } = useAPIv2();
  const [, , removeCookie] = useCookies();

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
                onNavigate?.();
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
                onNavigate?.();
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
                    clearAuthClientCookies(removeCookie);
                    window.location.reload();
                    setLogoutPopupActive(false);
                  })
                  .catch((err: any) => {
                    ALERT_ERROR(err);
                    clearAuthClientCookies(removeCookie);
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
