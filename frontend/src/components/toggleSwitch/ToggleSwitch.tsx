import React from "react";
import style from "./toggleSwitch.module.scss";

type Props = {
  onChange?: (b: boolean) => void;
  defaultChecked?: boolean;
  checked?: boolean;
  value?: any;
};

const ToggleSwitch = (props: Props) => {
  // Use controlled mode if 'checked' prop is provided, otherwise use uncontrolled mode
  const isControlled = props.checked !== undefined;

  return (
    <label className={style.switch}>
      <input
        type="checkbox"
        value={props.value}
        onChange={(e) => {
          props.onChange && props.onChange(e.target.checked);
        }}
        {...(isControlled
          ? { checked: props.checked }
          : { defaultChecked: props.defaultChecked }
        )}
      />
      <span className={style.slider}></span>
    </label>
  );
};

export default ToggleSwitch;
