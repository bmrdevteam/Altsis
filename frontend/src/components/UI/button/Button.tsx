import style from "./button.module.scss";

type Props = {
  children?: string;
  handleClick?: any;
  type?: string;
};

const Button = ({ children, handleClick, type }: Props) => {
  /////////////////////////////////////이세찬 일해라

  return (
    <div
      className={`${style.btn} ${
            type === "ghost"
          ? style.ghost
          : type === "round"
          ? style.round
          : ""
      }`}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};

const GoogleLogin = () => {
  return <div></div>;
};
export default Button;
