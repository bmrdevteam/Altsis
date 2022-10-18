/**
 * @file Popup component
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * - Popup component
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 * - move all inline styles to the scss file
 *
 */

import { CSSProperties } from "react";
import Svg from "../../assets/svg/Svg";
import style from "./popup.module.scss";

/**
 * Popup component
 *
 *
 * @param children
 * @param setState
 * @param title
 * @param closeBtn
 *
 * @returns
 */

type Props = {
  children: JSX.Element | JSX.Element[];
  setState: any;
  title?: string;
  style?: CSSProperties;
  closeBtn?: boolean;
  borderRadius?: string;
};
const Popup = (props: Props) => {
  /**
   * return the component
   */
  return (
    <div
      style={
        {
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2024,
        }
      }
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
          props.setState(false);
        }}
      ></div>

      <div
        className={style.popup_container}
        style={props.style}
      >
        <div className={style.popup}>
          <div className={style.title}>{props.title}</div>
          {props.closeBtn && (
            <div
              className={style.x}
              onClick={() => {
                props.setState(false);
              }}
            >
              <Svg type="x" width="24px" height="24px" />
            </div>
          )}
        </div>
        {props.children}
      </div>
    </div>
  );
};

export default Popup;
