import { ReactNode } from "react";
import Svg from "assets/svg/Svg";
import bStyle from "./boards.module.scss";

type PanelProps = {
  open: boolean;
  children: ReactNode;
};

type ToggleProps = {
  open: boolean;
  onToggle: () => void;
  className?: string;
  activeClassName?: string;
  iconSize?: string;
};

/**
 * 섹션 헤더에 두는 검색·필터 아이콘. 열려 있으면 강조된다.
 */
export const FilterCollapseToggle = ({
  open,
  onToggle,
  className,
  activeClassName,
  iconSize = "18px",
}: ToggleProps) => {
  const label = open ? "검색·필터 접기" : "검색·필터";

  return (
    <button
      type="button"
      className={`${className ?? bStyle.iconBtn} ${
        open ? activeClassName ?? bStyle.iconBtnActive : ""
      }`}
      aria-expanded={open}
      aria-pressed={open}
      title={label}
      aria-label={label}
      onClick={onToggle}
    >
      <Svg type="filter" width={iconSize} height={iconSize} />
    </button>
  );
};

/**
 * 검색+칩 필터 패널. 열림 여부는 헤더 토글이 가진다.
 */
const CollapsibleFilterBar = ({ open, children }: PanelProps) => {
  if (!open) return null;

  return <div className={bStyle.activityFilterBlock}>{children}</div>;
};

export default CollapsibleFilterBar;
