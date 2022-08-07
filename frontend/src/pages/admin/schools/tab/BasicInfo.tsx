import React from "react";
import style from "../../../../style/pages/admin/schools/schools.module.scss";
type Props = {};

const BasicInfo = (props: Props) => {
  return (
    <div>
      <div style={{ marginTop: "24px", display: "flex",width:"100%" }}>
        <div style={{ display: "flex", flexDirection: "column-reverse" }}>
          <input
            type="text"
            style={{ fontSize: "14px", padding: "8px", outline: "none",width:"100%" }}
          />
          <label style={{ fontSize: "12px", paddingBottom: "12px" }}>
            학교명
          </label>
        </div>
        <div style={{ display: "flex", flexDirection: "column-reverse" }}>
          <input
            type="text"
            style={{ fontSize: "14px", padding: "8px", outline: "none" }}
          />
          <label style={{ fontSize: "12px", paddingBottom: "12px" }}>
            학교명
          </label>
        </div>
      </div>
    </div>
  );
};

export default BasicInfo;
