import React from "react";
import style from "./input.module.scss";
type Props = {
  defaultValue?: string;
  placeholder?: string;
  label?: string;
};

const Input = (props: Props) => {
  return (
    <div className={style.input_container}>
      <input
        type="text"
        className={style.input}
        defaultValue={props.defaultValue}
        placeholder={props.placeholder}
      />
      <label style={{ fontSize: "12px", paddingBottom: "6px" }}>
        {props.label}
      </label>
    </div>
  );
};

export default Input;
