import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import useOutsideClick from "hooks/useOutsideClick";
import style from "./altBoard.module.scss";

type SortConfig = {
  fieldId: string;
  direction: "asc" | "desc";
} | null;

type Props = {
  fieldId: string;
  label: ReactNode;
  sortConfig: SortConfig;
  onSortCycle: (fieldId: string) => void;
  hasActiveFilter?: boolean;
  children: ReactNode;
};

const SheetColHeader = ({
  fieldId,
  label,
  sortConfig,
  onSortCycle,
  hasActiveFilter,
  children,
}: Props) => {
  const outsideClick = useOutsideClick();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 240;
    const left = Math.min(
      rect.left,
      Math.max(8, window.innerWidth - menuWidth - 8)
    );
    setMenuPos({ top: rect.bottom + 2, left });
  }, []);

  useEffect(() => {
    if (!outsideClick.active) return;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [outsideClick.active, updatePosition]);

  const sorted = sortConfig?.fieldId === fieldId;
  const sortMark = !sorted ? "" : sortConfig?.direction === "asc" ? "↑" : "↓";

  return (
    <th className={style.sheetColHeader}>
      <div className={style.sheetColHeaderInner}>
        <button
          type="button"
          className={style.sheetColLabel}
          onClick={() => onSortCycle(fieldId)}
          title="정렬"
        >
          <span className={style.sheetColLabelText}>{label}</span>
          {sorted && (
            <span className={style.sheetColSortMark} aria-hidden>
              {sortMark}
            </span>
          )}
        </button>
        <button
          ref={triggerRef}
          type="button"
          className={`${style.sheetColMenuBtn} ${
            outsideClick.active || hasActiveFilter
              ? style.sheetColMenuBtnActive
              : ""
          }`}
          title="필터"
          aria-expanded={outsideClick.active}
          onClick={(e) => {
            e.stopPropagation();
            updatePosition();
            outsideClick.setActive(!outsideClick.active);
          }}
        >
          ▾
        </button>
      </div>

      {outsideClick.active && (
        <div
          ref={outsideClick.RefObject}
          className={style.sheetColMenu}
          style={{ top: menuPos.top, left: menuPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={style.sheetColMenuFilterLabel}>필터</div>
          <div className={style.sheetColMenuFilter}>{children}</div>
        </div>
      )}
    </th>
  );
};

export default SheetColHeader;
