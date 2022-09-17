import style from "../editor.module.scss";

import { RefObject, useEffect, useState } from "react";
import Svg from "../../../assets/svg/Svg";

type Props = {
  containerRef: RefObject<HTMLDivElement>;
  editorRef: RefObject<HTMLDivElement>;
};

const SelectionMenu = ({ containerRef,editorRef }: Props) => {
  const [selectionX, setSelectionX] = useState<number>();
  const [selectionY, setSelectionY] = useState<number>();
  const [isSelecting, setIsSelecting] = useState<boolean>(false);

  document.onselectionchange = () => {
    if (document.getSelection()?.toString() !== "") {
      let i = document.getSelection()?.getRangeAt(0).getBoundingClientRect();
      setSelectionX(i!.x - editorRef.current!.offsetLeft);
      setSelectionY(
        i!.y - containerRef.current!.offsetTop + containerRef.current!.scrollTop
      );
    }

    return setIsSelecting(
      window.getSelection()?.toString() !== "" ? true : false
    );
  };

  const menuData: any[] = [
    { icon: <Svg width="20px" height="20px" type="bold" />, cmd: "bold" },
    { icon: <Svg width="20px" height="20px" type="text" /> },
    { icon: <Svg width="20px" height="20px" type="calender" /> },
    { icon: <Svg width="20px" height="20px" type="gear" /> },
  ];

  const MenuItem = ({ data }: { data: any }) => {
    return (
      <div
        className={style.menu_item}
        onClick={(e) => {
          document.execCommand(data.cmd);
        }}
      >
        {data.icon}
      </div>
    );
  };

  const MenuContainer = () => {
    return (
      <div
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        className={style.appearance_menu}
        style={{
          top: `${selectionY && selectionY - 48}px`,
          left: `${selectionX && selectionX}px`,
        }}
      >
        <div className={style.menu_items}>
          {menuData.map((value, index) => {
            return <MenuItem key={index} data={value} />;
          })}
        </div>
      </div>
    );
  };

  return <>{isSelecting && <MenuContainer />}</>;
};

export default SelectionMenu;
