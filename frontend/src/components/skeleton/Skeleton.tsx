import React from "react";
import style from "./skeleton.module.scss";
type Props = {
  height?: string;
  width?: string;
};

const Skeleton = (props: Props) => {
  return (
    <div
      style={{ height: props.height, width: props.width }}
      className={style.skeleton}
    ></div>
  );
};

export default Skeleton;
