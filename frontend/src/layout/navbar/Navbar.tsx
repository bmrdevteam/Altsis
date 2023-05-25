/**
 * notification component
 *
 * @returns notification component
 *
 * @example <Notification/>
 */

import { useEffect, useState } from "react";
import { useAuth } from "contexts/authContext";
import { useNavigate } from "react-router-dom";

// components
import Select from "components/select/Select";
import style from "./navbar.module.scss";
import useOutsideClick from "hooks/useOutsideClick";

import Notification from "./Notification";

type Props = { title?: string };

/**
 * Navbar component
 *
 * @param title the title in
 *
 * @returns Navbar component
 */
const Navbar = (props: Props) => {
  const {
    currentUser,
    currentRegistration,
    changeRegistration,
    currentSchool,
    currentSeason,
  } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Array<any>>([]);
  const [searchParam, setSearchParam] = useState<string>("");
  const outsideClick = useOutsideClick();

  const submit = (value: string | number) => {
    navigate(`/search/${value}`);
  };

  useEffect(() => {
    if (!currentSchool || !currentSeason || !currentSeason.registrations)
      return;

    const users = currentSeason.registrations.map((user: any) => {
      return {
        text: `${user.userName} / ${user.userId}`,
        value: user.user,
      };
    });
    setUsers(users);
  }, [currentSchool, currentSeason]);

  return (
    <div className={style.navbar_container}>
      {props.title && <div className={style.title}>{props.title}</div>}
      {/* <UserSearchBox /> */}
      <div className={style.user_search} ref={outsideClick.RefObject}>
        <input
          type="text"
          onClick={() => outsideClick.handleOnClick()}
          className={style.search}
          placeholder={"검색"}
          value={searchParam}
          onChange={(e) => {
            setSearchParam(e.target.value ?? "");
          }}
          onKeyUp={(e) => {
            if (e.key === "Enter") {
              setSearchParam(
                users.filter((val: any) => val.text?.includes(searchParam))[0]
                  .text ?? ""
              );
              users.filter((val: any) => val.text?.includes(searchParam))[0]
                .value &&
                submit(
                  users.filter((val: any) => val.text?.includes(searchParam))[0]
                    .value
                );
              outsideClick.setActive(false);
            }
          }}
        />
        {outsideClick.active && (
          <div className={style.result}>
            {users
              .filter((val: any) => val.text?.includes(searchParam))
              .map((val: any, ind: any) => {
                return (
                  <div
                    className={style.row}
                    key={`${ind}${val.text}`}
                    onClick={() => {
                      setSearchParam(val.text);
                      submit(val.value);
                      outsideClick.setActive(false);
                    }}
                  >
                    {val.text}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div className={style.menu_item} style={{ paddingLeft: "24px" }}>
        <Select
          appearence="flat"
          options={
            currentUser?.registrations
              ?.filter(
                (registration) => registration.school === currentSchool._id
              )
              .map((value: any, index: number) => {
                return {
                  text: `${value.year} ${value.term}`,
                  value: value._id,
                };
              }) ?? []
          }
          defaultSelectedValue={currentRegistration?._id}
          onChange={(value: any) => {
            changeRegistration(value);
          }}
        />
      </div>
      <div className={style.controls}>
        <Notification />
      </div>
    </div>
  );
};

export default Navbar;
