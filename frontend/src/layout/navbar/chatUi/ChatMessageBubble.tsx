import { ReactNode } from "react";
import style from "./chatUi.module.scss";

type Props = {
  variant: "own" | "other";
  sender?: ReactNode;
  time?: string;
  unreadCount?: number;
  wide?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

const ChatMessageBubble = ({
  variant,
  sender,
  time,
  unreadCount = 0,
  wide,
  actions,
  children,
  className,
}: Props) => (
  <div
    className={`${style.bubble} ${
      variant === "own" ? style.bubbleOwn : style.bubbleOther
    } ${wide ? style.bubbleWide : ""} ${className || ""}`}
  >
    {sender ? <div className={style.bubbleMeta}>{sender}</div> : null}
    <div>{children}</div>
    {time || unreadCount > 0 || actions ? (
      <div className={style.bubbleTimeRow}>
        {actions}
        {unreadCount > 0 || time ? (
          <div className={style.bubbleTimeMeta}>
            {unreadCount > 0 ? (
              <span
                className={style.unreadCount}
                aria-label={`안 읽음 ${unreadCount}`}
              >
                {unreadCount}
              </span>
            ) : null}
            {time ? <div className={style.bubbleTime}>{time}</div> : null}
          </div>
        ) : null}
      </div>
    ) : null}
  </div>
);

export default ChatMessageBubble;
