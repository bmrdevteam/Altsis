import React from "react";
import style from "./toggleSwitch.module.scss";

type Props = {
  onChange?: (b: boolean) => void;
  defaultChecked?: boolean;
  value?: any;
};

const ToggleSwitch = (props: Props) => {
  return (
    <label className={style.switch}>
      <input
        type="checkbox"
        value={props.value}
        onChange={(e) => {
          props.onChange && props.onChange(e.target.checked);
        }}
        defaultChecked={props.defaultChecked}
      />
      <span className={style.slider}></span>
    </label>
  );
};

export default ToggleSwitch;
