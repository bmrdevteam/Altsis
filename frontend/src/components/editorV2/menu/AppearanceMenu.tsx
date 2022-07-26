import useSelectionPosition from "../hooks/useSelectionPosition";
import style from "../editor.module.scss";
import { IAppearanceMenuItem } from "../types/dataTypes";
import Svg from "../assets/Svg";
type Props = {};

const AppearanceMenu = (props: Props) => {
  const { isSelecting, selectionX, selectionY } = useSelectionPosition();
  const menuData: IAppearanceMenuItem[] = [
    { icon: <Svg width="20px" height="20px" type="bold" /> },
    { icon: <Svg width="20px" height="20px" type="text" /> },
    { icon: <Svg width="20px" height="20px" type="calender" /> },
    { icon: <Svg width="20px" height="20px" type="gear" /> },
  ];

  const MenuItem = ({ icon }: { icon: JSX.Element }) => {
    return (
      <div
        className={style.menu_item}
        onClick={(e) => {
            window.getSelection()?.getRangeAt(0).surroundContents(document.createElement("span"))
          console.log("s");
        }}
      >
        {icon}
      </div>
    );
  };

  const MenuContainer = () => {
    return (
      <div
        onMouseDown={(e) => {e.preventDefault()
        }}
        className={style.appearance_menu}
        style={{
          top: `${
            selectionY && selectionY - 48 < 0
              ? 0
              : selectionY && selectionY - 48
          }px`,
          left: `${selectionX && selectionX - 48}px`,
        }}
      >
        <div className={style.menu_items}>
          {menuData.map((value, index) => {
            return <MenuItem key={index} icon={value.icon} />;
          })}
        </div>
      </div>
    );
  };

  return <>{isSelecting && <MenuContainer />}</>;
};

export default AppearanceMenu;
