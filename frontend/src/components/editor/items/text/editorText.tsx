import React from "react";

const Text = ({ children }: { children?: string | number }) => {
  return (
    <div
      contentEditable
      suppressContentEditableWarning={true}
      onBlur={()=>{console.log("end")}}
      onInput={(e) => {
        console.log(e.currentTarget.textContent);
      }}
      style={{ width: "100%", outline: "none", border: "none" }}
    >
      {children}
    </div>
  );
};

export default Text;
