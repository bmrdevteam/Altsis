import React from "react";
import style from "./input.module.scss";
type Props = {
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: any;
  onKeyDown?: any;
  ref?: any;
  style?:any;
};

const Input = (props: Props) => {
  return (
    <div className={style.input_container}>
      {props.label && (
        <label className={style.label}>
          {props.label}
          {props.required && <span className={style.required}>*</span>}
        </label>
      )}
      <input
        ref={props.ref}
        type={props.type ? props.type : "text"}
        className={style.input}
        defaultValue={props.defaultValue}
        placeholder={props.placeholder}
        onChange={props.onChange}
        required={props.required}
        disabled={props.disabled}
        onKeyDown={props.onKeyDown}
        style={props.style}
      />
    </div>
  );
};

export default Input;
