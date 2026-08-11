import {
  ReactNode,
  useEffect,
  useRef,
  KeyboardEvent,
  ChangeEvent,
  ClipboardEvent,
} from "react";
import Svg from "assets/svg/Svg";
import style from "./chatUi.module.scss";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  sendDisabled?: boolean;
  sendActive?: boolean;
  sendTitle?: string;
  leftSlot?: ReactNode;
  showTextarea?: boolean;
  centerHint?: ReactNode;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onKeyUp?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
  /** true면 바깥 padding/border 없이 필 바만 렌더 (Chat 드래그 컨테이너용) */
  bare?: boolean;
};

const TEXTAREA_MAX_HEIGHT_PX = 240;

const ChatInputBar = ({
  value,
  onChange,
  onSend,
  placeholder,
  disabled,
  sendDisabled,
  sendActive,
  sendTitle = "보내기",
  leftSlot,
  showTextarea = true,
  centerHint,
  onKeyDown,
  onKeyUp,
  onPaste,
  bare,
}: Props) => {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [value, showTextarea]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    adjustHeight();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendDisabled && !disabled) onSend();
    }
  };

  const bar = (
    <div className={style.inputBar}>
      {leftSlot}
      {showTextarea ? (
        <textarea
          ref={inputRef}
          className={style.textarea}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={onKeyUp}
          onPaste={onPaste}
          rows={1}
        />
      ) : (
        <span className={style.inputHint}>{centerHint}</span>
      )}
      <button
        type="button"
        className={`${style.sendButton} ${
          sendActive && !sendDisabled ? style.active : ""
        }`}
        disabled={sendDisabled || disabled}
        onClick={onSend}
        aria-label={sendTitle}
        title={sendTitle}
      >
        <Svg type="send" width="20px" height="20px" />
      </button>
    </div>
  );

  if (bare) return bar;
  return <div className={style.inputContainer}>{bar}</div>;
};

export default ChatInputBar;
