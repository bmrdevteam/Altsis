import React from "react";
import style from "./toggleSwitch.module.scss";

type Props = {
  onChange?: (b: boolean) => void;
  defaultChecked?: boolean;
  checked?: boolean;
  value?: any;
  disabled?: boolean;
};

const ToggleSwitch = (props: Props) => {
  const isControlled = props.checked !== undefined;

  return (
    <label className={`${style.switch} ${props.disabled ? style.disabled : ""}`}>
      <input
        type="checkbox"
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => {
          props.onChange && props.onChange(e.target.checked);
        }}
        {...(isControlled
          ? { checked: props.checked }
          : { defaultChecked: props.defaultChecked })}
      />
      <span className={style.slider}></span>
    </label>
  );
};

export default ToggleSwitch;
