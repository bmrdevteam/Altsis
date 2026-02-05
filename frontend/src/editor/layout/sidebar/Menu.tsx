import React, { useState } from "react";
import Svg from "../../../assets/svg/Svg";
import style from "../../editor.module.scss";

interface MenuProps {
  children: React.ReactNode | React.ReactNode[];
  name: string;
  defaultExpanded?: boolean;
}

const Menu = ({ children, name, defaultExpanded = true }: MenuProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={style.menu}>
      <div
        className={style.menu_header}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span className={style.menu_name}>{name}</span>
        <Svg
          type={expanded ? "chevronUp" : "chevronDown"}
          width="16px"
          height="16px"
        />
      </div>
      {expanded && <div className={style.content}>{children}</div>}
    </div>
  );
};

export default Menu;
