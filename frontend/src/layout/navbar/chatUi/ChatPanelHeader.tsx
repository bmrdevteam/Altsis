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
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onClose?: () => void;
  closeTitle?: string;
};

const ExpandIcon = ({ expanded }: { expanded: boolean }) =>
  expanded ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  );

const ChatPanelHeader = ({
  title,
  subtitle,
  leading,
  onBack,
  backDisabled,
  actions,
  isExpanded = false,
  onToggleExpand,
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
      {onToggleExpand && (
        <button
          type="button"
          className={style.iconBtn}
          onClick={onToggleExpand}
          aria-label={isExpanded ? "작게 보기" : "크게 보기"}
          title={isExpanded ? "작게 보기" : "크게 보기"}
        >
          <ExpandIcon expanded={isExpanded} />
        </button>
      )}
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
