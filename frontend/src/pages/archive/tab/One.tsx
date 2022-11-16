import Autofill from "components/input/Autofill";
import React from "react";
import style from "style/pages/archive.module.scss";
type Props = {};

const One = (props: Props) => {
  return (
    <div style={{ marginTop: "24px" }}>
      <div className={style.search}>
        <div className={style.label}>학생선택</div>
        <Autofill appearence="flat" options={[]} />
      </div>
    </div>
  );
};

export default One;
