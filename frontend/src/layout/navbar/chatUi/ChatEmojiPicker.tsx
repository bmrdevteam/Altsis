import { lazy, Suspense, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import style from "./chatUi.module.scss";

const PickerInner = lazy(() => import("./ChatEmojiPickerInner"));

type Props = {
  anchor: DOMRect;
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

const PICKER_WIDTH = 352;
const PICKER_HEIGHT = 420;

const ChatEmojiPicker = ({ anchor, onSelect, onClose }: Props) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  const left = Math.min(
    Math.max(8, anchor.left),
    Math.max(8, window.innerWidth - PICKER_WIDTH - 8)
  );
  const spaceBelow = window.innerHeight - anchor.bottom;
  const top =
    spaceBelow > PICKER_HEIGHT + 8
      ? anchor.bottom + 4
      : Math.max(8, anchor.top - PICKER_HEIGHT - 4);

  return createPortal(
    <div
      ref={rootRef}
      className={style.emojiPickerPortal}
      style={{ top, left }}
      role="dialog"
      aria-label="이모지 선택"
    >
      <Suspense
        fallback={
          <div className={style.emojiPickerFallback}>이모지를 불러오는 중...</div>
        }
      >
        <PickerInner
          onSelect={(emoji) => {
            onSelect(emoji);
            onClose();
          }}
        />
      </Suspense>
    </div>,
    document.body
  );
};

export default ChatEmojiPicker;
