/**
 * @file Loading Component
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
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
 *
 */
import React from "react";
import Svg from "../../assets/svg/Svg";
import style from "./loading.module.scss";
/**
 * Loading Component
 *
 * displays a loading screen while preparing components
 *
 * @returns Loading Component
 */
const Loading = (props: {
  coverScreen?: boolean;
  height?: React.CSSProperties["height"];
  text?: string;
  iconHeight?: string;
}) => {
  return (
    <div
      style={{ height: props.height }}
      className={`${style.loading} ${props.coverScreen && style.cover_screen}`}
    >
      <div className={style.icon}>
        <Svg
          type={"loading"}
          width={props.iconHeight ?? "48px"}
          height={props.iconHeight ?? "48px"}
        />
      </div>
      <div className={style.text}>{props.text ?? "로딩중"}</div>
    </div>
  );
};

export default Loading;
