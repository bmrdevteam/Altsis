import { useEffect, useState } from "react";
import style from "./button.module.scss";

type Props = {
  children?: string;
  onClick?: any;
  type?: "ghost" | "solid";
  borderRadius?: string;
  round?: boolean;
  disabled?: boolean;
  disableOnclick?: boolean;
  maxWidth?: string;
  height?: string;
};

const Button = ({
  children,
  onClick,
  type,
  round,
  borderRadius,
  disabled,
  disableOnclick,
  maxWidth,
  height,
}: Props) => {
  const [disable, setDisable] = useState<boolean>(false);

  let btnClass = style.btn;

  if (type === "ghost") {
    btnClass += " " + style.ghost;
  }
  if (round) {
    btnClass += " " + style.round;
  }
  if (disabled || disable) {
    btnClass += " " + style.disabled;
  }

  return (
    <div
      className={`${btnClass} `}
      style={{
        maxWidth: maxWidth,
        borderRadius: borderRadius,
        height: height,
      }}
      onClick={() => {
        if (!disable && !disabled) {
          onClick();
        }
        if (disableOnclick && !disabled && !disable) {
          setDisable(true);
        }
      }}
    >
      {children}
    </div>
  );
};

export default Button;
