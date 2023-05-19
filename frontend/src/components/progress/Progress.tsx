/**
 * @file ProgressBar component
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
import { CSSProperties } from "react";
import progressStyle from "./progress.module.scss";

type Props = {
  value: number; // 0.75 -> 75%
  showIconSuccess?: boolean;
  showIconError?: boolean;
  style?: CSSProperties;
};

const Progress = ({ value, showIconSuccess, showIconError, style }: Props) => {
  let progressClass = progressStyle.progress;

  let icon = "check-circle";

  if (showIconSuccess) {
    progressClass += " " + progressStyle.success;
    icon = "check-circle";
  }

  if (showIconError) {
    progressClass += " " + progressStyle.error;
    icon = "x-circle";
  }

  return (
    <div className={`${progressClass}`} style={style}>
      <div className={`${progressStyle.outer}`}>
        <div className={`${progressStyle.inner}`}>
          <div
            className={`${progressStyle.bar}`}
            style={{ width: `${value * 100}%` }}
          ></div>
        </div>
      </div>
      {(showIconSuccess || showIconError) && (
        <div className={`${progressStyle.icon}`}>
          <Svg type={icon} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
    </div>
  );
};

export default Progress;
