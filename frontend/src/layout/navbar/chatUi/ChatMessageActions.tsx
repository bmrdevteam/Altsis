import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Svg from "assets/svg/Svg";
import { PRESET_REACTION_EMOJIS } from "./chatMessageExtras";
import style from "./chatUi.module.scss";

type Props = {
  isOwn: boolean;
  onReply: () => void;
  onPresetEmoji: (emoji: string) => void;
  onOpenPicker: (anchor: DOMRect) => void;
  onDelete?: () => void;
};

const MENU_WIDTH = 180;
const MENU_HEIGHT = 148;
const PRESET_WIDTH = 320;
const PRESET_HEIGHT = 44;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const menuPos = (anchor: DOMRect) => {
  let left = anchor.right + 4;
  if (left + MENU_WIDTH > window.innerWidth - 8) {
    left = anchor.left - MENU_WIDTH - 4;
  }
  let top = anchor.bottom + 4;
  if (top + MENU_HEIGHT > window.innerHeight - 8) {
    top = anchor.top - MENU_HEIGHT - 4;
  }
  return {
    top: clamp(top, 8, window.innerHeight - MENU_HEIGHT - 8),
    left: clamp(left, 8, window.innerWidth - MENU_WIDTH - 8),
  };
};

const presetPos = (anchor: DOMRect) => {
  const left = clamp(
    anchor.left + anchor.width / 2 - PRESET_WIDTH / 2,
    8,
    window.innerWidth - PRESET_WIDTH - 8
  );
  const top = clamp(anchor.top - PRESET_HEIGHT - 8, 8, window.innerHeight - PRESET_HEIGHT - 8);
  return { top, left };
};

const ChatMessageActions = ({
  isOwn,
  onReply,
  onPresetEmoji,
  onOpenPicker,
  onDelete,
}: Props) => {
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const [presetAnchor, setPresetAnchor] = useState<DOMRect | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const presetRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuAnchor && !presetAnchor) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuAnchor(null);
        setPresetAnchor(null);
        setConfirmDelete(false);
      }
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target) ||
        presetRef.current?.contains(target)
      ) {
        return;
      }
      setMenuAnchor(null);
      setPresetAnchor(null);
      setConfirmDelete(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [menuAnchor, presetAnchor]);

  const closeAll = () => {
    setMenuAnchor(null);
    setPresetAnchor(null);
    setConfirmDelete(false);
  };

  const menu = menuAnchor ? menuPos(menuAnchor) : null;
  const preset = presetAnchor ? presetPos(presetAnchor) : null;

  return (
    <div
      className={`${style.messageActions} ${
        menuAnchor || presetAnchor ? style.messageActionsOpen : ""
      }`}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`${style.actionBtn} ${style.actionBtnReact}`}
        title="메시지 메뉴"
        aria-label="메시지 메뉴"
        aria-expanded={!!menuAnchor}
        onClick={(e) => {
          e.stopPropagation();
          setPresetAnchor(null);
          setConfirmDelete(false);
          if (menuAnchor) {
            setMenuAnchor(null);
            return;
          }
          setMenuAnchor(e.currentTarget.getBoundingClientRect());
        }}
      >
        <span aria-hidden>⋯</span>
      </button>
      {menu
        ? createPortal(
            <div
              ref={menuRef}
              className={style.actionMenu}
              role="menu"
              aria-label="메시지 메뉴"
              style={{ top: menu.top, left: menu.left }}
            >
              {confirmDelete ? (
                <>
                  <p className={style.actionMenuWarn}>
                    이 메시지를 삭제할까요?
                  </p>
                  <button
                    type="button"
                    className={style.actionMenuItem}
                    role="menuitem"
                    onClick={() => setConfirmDelete(false)}
                  >
                    <span aria-hidden>✖️</span> 취소
                  </button>
                  <button
                    type="button"
                    className={`${style.actionMenuItem} ${style.actionMenuItemDanger}`}
                    role="menuitem"
                    onClick={() => {
                      closeAll();
                      onDelete?.();
                    }}
                  >
                    <span aria-hidden>🗑️</span> 삭제
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={style.actionMenuItem}
                    role="menuitem"
                    onClick={() => {
                      closeAll();
                      onReply();
                    }}
                  >
                    <span aria-hidden>💬</span> 답장
                  </button>
                  <button
                    type="button"
                    className={style.actionMenuItem}
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPresetAnchor(e.currentTarget.getBoundingClientRect());
                    }}
                  >
                    <span aria-hidden>😊</span> 리액션
                  </button>
                  {isOwn && onDelete ? (
                    <button
                      type="button"
                      className={`${style.actionMenuItem} ${style.actionMenuItemDanger}`}
                      role="menuitem"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <span aria-hidden>🗑️</span> 삭제
                    </button>
                  ) : null}
                </>
              )}
            </div>,
            document.body
          )
        : null}
      {preset
        ? createPortal(
            <div
              ref={presetRef}
              className={style.presetRow}
              role="listbox"
              aria-label="리액션 선택"
              style={{ top: preset.top, left: preset.left }}
            >
              {PRESET_REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={style.presetEmoji}
                  aria-label={emoji}
                  onClick={() => {
                    onPresetEmoji(emoji);
                    closeAll();
                  }}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                className={style.presetEmoji}
                title="다른 이모지"
                aria-label="다른 이모지"
                onClick={(e) => {
                  onOpenPicker(e.currentTarget.getBoundingClientRect());
                  closeAll();
                }}
              >
                <Svg type="plus" width="14px" height="14px" />
              </button>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default ChatMessageActions;
