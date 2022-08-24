import Svg from "../../assets/svg/Svg";
import style from "./popup.module.scss";
const Popup = ({
  children,
  setState,
  title,
}: {
  children: JSX.Element | JSX.Element[];
  setState: any;
  title: string;
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
      <div
        style={{
          position: "absolute",
          zIndex: 2026,
          backgroundColor: "#fff",
        }}
      >
        <div className={style.popup_container}>
          <div
            style={{
              display: "flex",

              alignItems: "flex-start",
            }}
          >
            <div className={style.title}>{title}</div>
            <div
              className={style.x}
              onClick={() => {
                setState(false);
              }}
            >
              <Svg type="x" width="24px" height="24px" />
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Popup;
