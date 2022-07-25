import React, { useState } from "react";
import Svg from "../../../../assets/svg/Svg";
import style from "./editorMenu.module.scss";
type Props = {};

const EditorMenu = (props: Props) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [menuItems, setMenuItems] = useState([
    { icon: <Svg type="text" />, text: "텍스트" },
    { icon: <Svg type="border" />, text: "테두리" },
    { icon: <Svg type="calender" />, text: "배경" },
    { icon: <Svg type="gear" />, text: "음" },
    { icon: <Svg type="border" />, text: "이건 정말" },
    { icon: <Svg type="calender" />, text: "힘들어" },
  ]);
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
        {menuItems
          .filter((value) => {
            if (searchTerm == "") {
              return value;
            } else if (
              value.text.toLowerCase().includes(searchTerm.toLowerCase())
            ) {
              return value;
            }
          })
          .map((value, index) => {
            return (
              <div key={index} className={style.menu_item}>
                <div className={style.icon}>{value.icon}</div>
                <div className={style.text}>{value.text}</div>
                <Svg type="chevronRight" />
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default EditorMenu;
