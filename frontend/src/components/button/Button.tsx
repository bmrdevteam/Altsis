import style from "./button.module.scss";

type Props = {
  children?: string;
  onClick?: any;
  type?: "ghost" | "solid";
  borderRadius?: string;
  round?: boolean;
  maxWidth?: string;
  height?: string;
};

const Button = ({
  children,
  onClick,
  type,
  round,
  borderRadius,
  maxWidth,
  height,
}: Props) => {
  /////////////////////////////////////이세찬 일해라

  let btnClass = style.btn;

  if (type === "ghost") {
    btnClass += " " + style.ghost;
  }
  if (round) {
    btnClass += " " + style.round;
  }

  return (
    <div
      className={btnClass}
      style={{
        maxWidth: maxWidth,
        borderRadius: borderRadius,
        height: height,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Button;
