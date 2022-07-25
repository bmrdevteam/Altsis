import React from "react";
import Svg from "../../../../assets/svg/Svg";
import style from "./editorMenu.module.scss";
type Props = {};

const EditorMenu = (props: Props) => {
  return (
    <div className={style.menu}>
      <div className={style.menu_items}>
        <div className={style.menu_item}>
          <div className={style.icon}>
            <Svg type="text" />
          </div>
          <div className={style.text}>텍스트</div>
          <Svg type="chevronRight" />
        </div>
        <div className={style.menu_item}>
          <div className={style.icon}>
            <Svg type="border" />
          </div>
          <div className={style.text}>테두리</div>
          <Svg type="chevronRight" />
        </div>
        <div className={style.menu_item}>
          <div className={style.icon}>
            <Svg type="calender" />
          </div>
          <div className={style.text}>배경 </div>
          <Svg type="chevronRight" />
        </div>
      </div>
    </div>
  );
};

export default EditorMenu;
