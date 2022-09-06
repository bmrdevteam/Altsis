import React from "react";
import style from "./textarea.module.scss";
type Props = {
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: any;
  onKeyDown?: any;
  ref?: any;
  style?: any;
  textareaStyle?: "flat";
};

const Textarea = (props: Props) => {
  return (
    <div className={`${style.textarea_container} ${style.flat}`}>
      {props.label && (
        <label className={style.label}>
          {props.label}
          {props.required && <span className={style.required}>*</span>}
        </label>
      )}
      <textarea
        ref={props.ref}
        className={style.textarea}
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

export default Textarea;
