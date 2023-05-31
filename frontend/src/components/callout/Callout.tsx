/**
 * @file callout component
 *
 * @author jessie129j <jessie129j@gmail.com>
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

import Svg from "assets/svg/Svg";
import { CSSProperties, useState } from "react";
import calloutStyle from "./callout.module.scss";

type Props = {
  type?: "success" | "info" | "warning" | "error";
  showIcon?: boolean;
  title: string;
  description?: string;
  child?: any;
  style?: CSSProperties;
};

const Callout = ({
  type,
  showIcon,
  title,
  description,
  child,
  style,
}: Props) => {
  let calloutClass = calloutStyle.callout;

  let icon = "check-circle";

  if (type === "info") {
    calloutClass += " " + calloutStyle.info;
    icon = "info-circle";
  }

  if (type === "warning") {
    calloutClass += " " + calloutStyle.warning;
    icon = "info-circle";
  }

  if (type === "error") {
    calloutClass += " " + calloutStyle.error;
    icon = "x-circle";
  }

  return (
    <div className={`${calloutClass}`} style={style}>
      {showIcon && (
        <div className={`${calloutStyle.icon}`}>
          <Svg type={icon} style={{ width: "24px", height: "24px" }} />
        </div>
      )}
      <div className={`${calloutStyle.text}`}>
        {!description && !child ? (
          <div className={`${calloutStyle["title-oneline"]}`}>{title}</div>
        ) : (
          <>
            <div className={`${calloutStyle.title}`}>{title}</div>
            <div className={`${calloutStyle.description}`}>
              {description ?? child}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Callout;
