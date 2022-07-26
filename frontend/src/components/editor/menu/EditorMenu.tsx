import React, { useState } from "react";
import Svg from "../../../assets/svg/Svg";
import useSearch from "../../../hooks/useSearch";
import style from "./editorMenu.module.scss";
type Props = {};

const EditorMenu = (props: Props) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [menuItems, setMenuItems] = useState([
    { icon: <Svg type="plus" width="17px" height="17px" />, text: "추가" },
    { icon: <Svg type="text" />, text: "텍스트" },
    { icon: <Svg type="border" />, text: "테두리" },
    { icon: <Svg type="calender" />, text: "배경" },
    { icon: <Svg type="gear" />, text: "음" },
    { icon: <Svg type="border" />, text: "이건 정말" },
  ]);
  const search = useSearch({
    array: menuItems,
    searchTerm: searchTerm,
    searchValue: "text",
  });

  return (
    <div className={style.menu}>
      <div className={style.menu_items}>
        <div className={style.menu_item}>
          <input
            type="text"
            className={style.search}
            placeholder="검색"
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
          />
        </div>
        {search.map((value, index) => {
          return (
            <div key={index} className={style.menu_item}>
              <div className={style.icon}>{value.icon}</div>
              <div className={style.text}>{value.text}</div>
              {/* <Svg type="chevronRight" /> */}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EditorMenu;
