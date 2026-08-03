import { ReactNode } from "react";
import style from "./chatUi.module.scss";

type Props = {
  variant: "own" | "other";
  sender?: ReactNode;
  time?: string;
  wide?: boolean;
  children: ReactNode;
  className?: string;
};

const ChatMessageBubble = ({
  variant,
  sender,
  time,
  wide,
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
    {time ? <div className={style.bubbleTime}>{time}</div> : null}
  </div>
);

export default ChatMessageBubble;
