import { ReactNode } from "react";
import style from "./chatUi.module.scss";

type Props = {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

const ChatEmptyState = ({ icon, title, subtitle, action }: Props) => (
  <div className={style.emptyState}>
    {icon}
    <p className={style.emptyStateText}>{title}</p>
    {subtitle ? <p className={style.emptyStateSub}>{subtitle}</p> : null}
    {action}
  </div>
);

export default ChatEmptyState;
