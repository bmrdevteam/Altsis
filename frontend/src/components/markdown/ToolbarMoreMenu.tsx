import { createPortal } from "react-dom";
import Svg from "assets/svg/Svg";
import style from "./markdown.module.scss";
import { useToolbarFixedPopup } from "./useToolbarFixedPopup";

export type MoreMenuItem = {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  /** true면 클릭 후 메뉴를 닫지 않음 (하위 패널 전환 등) */
  skipClose?: boolean;
};

type Props = {
  items: MoreMenuItem[];
  onClose: () => void;
  /** 색상/하이라이트 등 커스텀 슬롯 */
  children?: React.ReactNode;
};

const ToolbarMoreMenu = ({ items, onClose, children }: Props) => {
  const { menuRef, anchorRef, coords } = useToolbarFixedPopup({
    onClose,
    fallbackWidth: 180,
  });

  return (
    <>
      <span ref={anchorRef} className={style.toolbarPopupAnchor} aria-hidden />
      {coords &&
        createPortal(
          <div
            className={style.toolbarMoreMenu}
            ref={menuRef}
            data-editor-popup
            style={{ top: coords.top, left: coords.left }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`${style.toolbarMoreItem} ${
                  item.active ? style.toolbarMoreItemActive : ""
                }`}
                onClick={() => {
                  item.onClick();
                  if (!item.skipClose) onClose();
                }}
              >
                <Svg type={item.icon} width="16px" height="16px" />
                <span>{item.label}</span>
              </button>
            ))}
            {children}
          </div>,
          document.body
        )}
    </>
  );
};

export default ToolbarMoreMenu;
