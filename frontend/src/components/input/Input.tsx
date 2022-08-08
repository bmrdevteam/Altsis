import React from "react";

type Props = {
  defaultValue?: string;
  label?: string;
};

const Input = (props: Props) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column-reverse",
        marginTop:"24px",
        flex: "1 1 0",
      }}
    >
      <input
        type="text"
        defaultValue={props.defaultValue}
        style={{
          fontSize: "14px",
          padding: "8px",
          outline: "none",
          border: "1px solid rgb(225,225,225)",
          width:"100%"
        }}
      />
      <label style={{ fontSize: "12px", paddingBottom: "6px" }}>{props.label}</label>
    </div>
  );
};


export default Input;
