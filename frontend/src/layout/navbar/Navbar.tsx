import { useAuth } from "contexts/authContext";

import Select from "components/select/Select";
import Svg from "assets/svg/Svg";
import CommandPalette from "components/commandPalette/CommandPalette";
import useCommandPalette from "components/commandPalette/useCommandPalette";
import style from "./navbar.module.scss";

import Notification from "./Notification";
import Chat from "./Chat";

type Props = { title?: string };

const Navbar = (props: Props) => {
  const { currentUser, currentRegistration, changeRegistration, currentSchool } =
    useAuth();
  const { isOpen, open, close } = useCommandPalette();

  const isMac =
    typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);

  return (
    <div className={style.navbar_container}>
      {props.title && <div className={style.title}>{props.title}</div>}

      <div className={style.search_trigger} onClick={open}>
        <Svg type="search" />
        <span className={style.search_placeholder}>검색</span>
        <span className={style.search_shortcut}>{isMac ? "⌘K" : "Ctrl+K"}</span>
      </div>

      {(() => {
        const seasonOptions =
          currentUser?.registrations
            ?.filter(
              (registration) => registration.school === currentSchool?._id
            )
            .map((value: any) => ({
              text: `${value.year} ${value.term}`,
              value: value._id,
            })) ?? [];
        if (seasonOptions.length === 0) return null;
        return (
          <div className={style.menu_item} style={{ paddingLeft: "24px" }}>
            <Select
              appearence="flat"
              options={seasonOptions}
              defaultSelectedValue={currentRegistration?._id}
              onChange={(value: any) => {
                changeRegistration(value);
              }}
            />
          </div>
        );
      })()}
      <div className={style.controls}>
        <Notification />
        <Chat />
      </div>

      {isOpen && <CommandPalette onClose={close} />}
    </div>
  );
};

export default Navbar;
