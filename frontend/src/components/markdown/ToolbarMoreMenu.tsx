import { useEffect, useRef } from "react";
import Svg from "assets/svg/Svg";
import style from "./markdown.module.scss";

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      className={style.toolbarMoreMenu}
      ref={ref}
      data-editor-popup
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
    </div>
  );
};

export default ToolbarMoreMenu;
