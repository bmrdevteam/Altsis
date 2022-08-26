import Svg from "../../assets/svg/Svg";
import style from "./popup.module.scss";
const Popup = ({
  children,
  setState,
  title,
  closeBtn,
}: {
  children: JSX.Element | JSX.Element[];
  setState: any;
  title: string;
  closeBtn?: boolean;
}) => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2024,
      }}
    >
      <div
        style={{
          width: "100vw",
          height: "100vh",
          zIndex: 2025,
          backgroundColor: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(1px)",
        }}
        onClick={() => {
          setState(false);
        }}
      ></div>
      <div className={style.popup_container}>
        <div className={style.popup}>
          <div className={style.title}>{title}</div>
          {closeBtn && (
            <div
              className={style.x}
              onClick={() => {
                setState(false);
              }}
            >
              <Svg type="x" width="24px" height="24px" />
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
};

export default Popup;
