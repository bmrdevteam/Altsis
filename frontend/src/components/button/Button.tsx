import { useEffect, useState } from "react";
import style from "./button.module.scss";

type Props = {
  children?: string;
  onClick?: any;
  type?: "ghost" | "solid" | "hover";
  round?: boolean;
  disabled?: boolean;
  disableOnclick?: boolean;
  styles?: object;
};

const Button = ({
  children,
  onClick,
  type,
  round,
  disabled,
  disableOnclick,
  styles,
}: Props) => {
  const [disable, setDisable] = useState<boolean>(false);

  let btnClass = style.btn;

  if (type === "ghost") {
    btnClass += " " + style.ghost;
  }
  if (type ==="hover") {
    btnClass += " " + style.hover;
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
      style={styles}
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
