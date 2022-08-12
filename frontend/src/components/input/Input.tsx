import React from "react";
import style from "./input.module.scss";
type Props = {
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: any;
};

const Input = (props: Props) => {
  return (
    <div className={style.input_container}>
      <label className={style.label}>
        {props.label}
        {props.required && <span className={style.required}>*</span>}
      </label>
      <input
        type="text"
        className={style.input}
        defaultValue={props.defaultValue}
        placeholder={props.placeholder}
        onChange={props.onChange}
        required={props.required}
        disabled={props.disabled}
      />
    </div>
  );
};

export default Input;
