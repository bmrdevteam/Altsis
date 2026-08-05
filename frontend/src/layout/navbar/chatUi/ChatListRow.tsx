import { ReactNode, useEffect, useRef, useState } from "react";
import Svg from "assets/svg/Svg";
import style from "./chatUi.module.scss";

export type TChatListMenuItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onClick: () => void;
};

export type TChatListTitleEdit = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

type Props = {
  title: string;
  count?: number | string;
  time?: ReactNode;
  preview?: ReactNode;
  leading?: ReactNode;
  active?: boolean;
  menuItems?: TChatListMenuItem[];
  titleEdit?: TChatListTitleEdit;
  onClick: () => void;
};

const ChatListRow = ({
  title,
  count,
  time,
  preview,
  leading,
  active,
  menuItems,
  titleEdit,
  onClick,
}: Props) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    requestAnimationFrame(() => {
      const dropdown = menuRef.current?.querySelector(
        `.${style.listMenuDropdown}`
      ) as HTMLElement | null;
      dropdown?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  const isEditingTitle = !!titleEdit;
  useEffect(() => {
    if (!isEditingTitle) return;
    inputRef.current?.focus();
    inputRef.current?.select();
    // 편집 모드 진입 시에만 전체 선택 — value 변경마다 select 하면 한 글자만 남음
  }, [isEditingTitle]);

  return (
    <div
      className={`${style.listRow} ${active ? style.listRowActive : ""}`}
      onClick={titleEdit ? undefined : onClick}
    >
      {leading ? <div className={style.listLeading}>{leading}</div> : null}
      <div className={style.listInfo}>
        <div className={style.listHeaderRow}>
          {titleEdit ? (
            <input
              ref={inputRef}
              className={style.listTitleInput}
              value={titleEdit.value}
              onChange={(e) => titleEdit.onChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  titleEdit.onSubmit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  titleEdit.onCancel();
                }
              }}
              onBlur={() => titleEdit.onSubmit()}
              maxLength={40}
              aria-label="대화 이름"
            />
          ) : (
            <span className={style.listTitle}>
              {title}
              {count != null && count !== "" ? (
                <span className={style.listCount}>({count})</span>
              ) : null}
            </span>
          )}
          {!titleEdit && time ? (
            <span className={style.listTime}>{time}</span>
          ) : null}
        </div>
        {!titleEdit && preview ? (
          <div className={style.listPreview}>{preview}</div>
        ) : null}
      </div>
      {!titleEdit && menuItems && menuItems.length > 0 && (
        <div
          className={style.listMenu}
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={style.listMenuBtn}
            aria-label="메뉴"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Svg
              type="verticalDots"
              width="16px"
              height="16px"
              style={{ fill: "var(--accent-3)" }}
            />
          </button>
          {menuOpen && (
            <div className={style.listMenuDropdown}>
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`${style.listMenuItem} ${
                    item.danger ? style.listMenuItemDanger : ""
                  }`}
                  onClick={() => {
                    setMenuOpen(false);
                    item.onClick();
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatListRow;
