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
import { CSSProperties } from "react";
import calloutStyle from "./callout.module.scss";

export type TCalloutItem = {
  key?: string;
  label: string;
  message: string;
};

type Props = {
  type?: "success" | "info" | "warning" | "error";
  showIcon?: boolean;
  title: string;
  description?: string;
  items?: TCalloutItem[];
  child?: any;
  style?: CSSProperties;
};

const Callout = ({
  type,
  showIcon,
  title,
  description,
  items,
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

  const hasItems = (items?.length ?? 0) > 0;
  const hasBody = Boolean(description || child || hasItems);

  return (
    <div className={calloutClass} style={style}>
      {showIcon && (
        <div className={calloutStyle.icon}>
          <Svg type={icon} style={{ width: "24px", height: "24px" }} />
        </div>
      )}
      <div className={calloutStyle.text}>
        {!hasBody ? (
          <div className={calloutStyle["title-oneline"]}>{title}</div>
        ) : (
          <>
            <div className={calloutStyle.title}>{title}</div>
            {description ? (
              <div className={calloutStyle.description}>{description}</div>
            ) : null}
            {hasItems && items ? (
              <ul className={calloutStyle.failList}>
                {items.map((item, index) => (
                  <li
                    key={item.key || `${item.label}-${index}`}
                    className={calloutStyle.failItem}
                  >
                    <div className={calloutStyle.failLabel}>{item.label}</div>
                    <div className={calloutStyle.failMessage}>{item.message}</div>
                  </li>
                ))}
              </ul>
            ) : null}
            {!description && child ? (
              <div className={calloutStyle.description}>{child}</div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default Callout;
