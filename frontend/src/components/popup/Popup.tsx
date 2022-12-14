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

type Props = {
  children: JSX.Element | JSX.Element[];
  footer?: JSX.Element | JSX.Element[];
  setState: any;
  title?: string;
  style?: CSSProperties;
  closeBtn?: boolean;
  borderRadius?: string;
  contentScroll?: boolean;
};
/**
 * Popup component
 *
 *
 * @param children
 * @param setState
 * @param title
 * @param closeBtn
 *
 * @returns Popup component
 *
 * @example 
 * 
 * {popupActive && <Popup
     title="pop"
     setState={setPopupActive}
     style={{ borderRadius: "4px", maxWidth: "800px", width: "100%" }}
     closeBtn
      footer={
        <Button
          type={"ghost"}
          onClick={() => {
            //close the popup
            setPopupActive(false)
          }}
        >
          저장
        </Button>
      }
   >
    <div>content</div>
  </Popup>
  }
 */
const Popup = (props: Props) => {
  /**
   * return the component
   */
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "calc(100vw - 48px)",
        height: "calc(100vh - 48px)",
        display: "flex",
        margin: "24px",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2024,
      }}
    >
      <div className={style.popup_container} style={props.style}>
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
        <div
          className={style.content}
          style={{ overflowY: props.contentScroll ? "scroll" : "hidden" }}
        >
          {props.children}
        </div>
        {props.footer && <div className={style.footer}>{props.footer}</div>}
      </div>
      <div
        className={style.popup_background}
        onClick={() => {
          props.setState(false);
        }}
      ></div>
    </div>
  );
};

export default Popup;
