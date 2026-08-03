import { ReactNode } from "react";
import Svg from "assets/svg/Svg";
import style from "./chatUi.module.scss";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  onBack?: () => void;
  backDisabled?: boolean;
  actions?: ReactNode;
  onClose?: () => void;
  closeTitle?: string;
};

const ChatPanelHeader = ({
  title,
  subtitle,
  leading,
  onBack,
  backDisabled,
  actions,
  onClose,
  closeTitle = "닫기",
}: Props) => (
  <div className={style.header}>
    <div className={style.titleArea}>
      {onBack && (
        <button
          type="button"
          className={style.iconBtn}
          onClick={onBack}
          disabled={backDisabled}
          aria-label="목록으로"
          title="목록으로"
        >
          <Svg
            type="arrowLeft"
            width="16px"
            height="16px"
            style={{ fill: "var(--accent-1)" }}
          />
        </button>
      )}
      {leading}
      <div className={style.titleInfo}>
        <h3 className={style.title}>{title}</h3>
        {subtitle ? <span className={style.subtitle}>{subtitle}</span> : null}
      </div>
    </div>
    <div className={style.headerActions}>
      {actions}
      {onClose && (
        <button
          type="button"
          className={style.iconBtn}
          onClick={onClose}
          aria-label="닫기"
          title={closeTitle}
        >
          <Svg type="x" width="16px" height="16px" />
        </button>
      )}
    </div>
  </div>
);

export default ChatPanelHeader;
