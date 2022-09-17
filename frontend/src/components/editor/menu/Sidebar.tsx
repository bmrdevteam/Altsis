import React from "react";
import style from "../editor.module.scss";

type Props = {};
/**
 *
 * @param param0
 *
 *
 * @returns
 */
function Sidebar({}: Props) {
  return (
    <div className={style.sidebar_container}>
      <div className={style.sidebar}>
        <div className={style.item}>
          <div className={style.label}>텍스트</div>
          <div className={style.content}>
            <div> </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
