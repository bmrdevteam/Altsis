import { ReactNode } from "react";
import style from "./chatUi.module.scss";

type Props = {
  children: ReactNode;
  onOverlayClick?: () => void;
  showOverlay?: boolean;
  variant?: "default" | "expanded";
  className?: string;
};

const ChatPanelShell = ({
  children,
  onOverlayClick,
  showOverlay = true,
  variant = "default",
  className,
}: Props) => {
  const expanded = variant === "expanded";
  return (
    <>
      {showOverlay && (
        <div
          className={`${style.overlay} ${expanded ? style.overlayExpanded : ""}`}
          onClick={onOverlayClick}
          aria-hidden
        />
      )}
      <div
        className={`${style.panel} ${expanded ? style.panelExpanded : ""} ${
          className || ""
        }`}
      >
        {children}
      </div>
    </>
  );
};

export default ChatPanelShell;
