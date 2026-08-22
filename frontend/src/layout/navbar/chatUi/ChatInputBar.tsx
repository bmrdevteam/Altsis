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
  /** 값이 바뀌면 textarea에 포커스하고 인용 다음으로 커서를 둔다 */
  focusNonce?: number;
  onRefine?: () => void;
  refineDisabled?: boolean;
  refineActive?: boolean;
  refineTitle?: string;
};

const RefineSparkle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="currentColor"
      d="M11.5 9.5 9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5z"
    />
    <path
      fill="currentColor"
      d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9z"
    />
    <path
      fill="currentColor"
      d="M19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"
    />
  </svg>
);

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
  focusNonce,
  onRefine,
  refineDisabled,
  refineActive,
  refineTitle = "요청 다듬기",
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

  useEffect(() => {
    if (!focusNonce) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const blank = value.indexOf("\n\n");
    const pos = blank >= 0 ? blank + 2 : value.length;
    el.setSelectionRange(pos, pos);
    adjustHeight();
  }, [focusNonce]);

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
      {onRefine ? (
        <button
          type="button"
          className={`${style.sendButton} ${style.refineButton} ${
            refineActive && !refineDisabled ? style.refineActive : ""
          }`}
          disabled={refineDisabled || disabled}
          onClick={onRefine}
          aria-label={refineTitle}
          title={refineTitle}
        >
          <RefineSparkle />
        </button>
      ) : null}
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
