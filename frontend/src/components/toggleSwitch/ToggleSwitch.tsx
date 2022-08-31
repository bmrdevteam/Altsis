import React from "react";
import style from "./toggleSwitch.module.scss";

type Props = { onChange?: any; defaultChecked?: boolean };

const ToggleSwitch = (props: Props) => {
  return (
    <label className={style.switch}>
      <input type="checkbox" onChange={props.onChange} defaultChecked={props.defaultChecked} />
      <span className={style.slider}></span>
    </label>
  );
};

export default ToggleSwitch;
