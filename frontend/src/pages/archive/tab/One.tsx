import Autofill from "components/input/Autofill";
import React from "react";
import style from "style/pages/archive.module.scss";
type Props = {
  users: any[];
};

const One = (props: Props) => {

  return (
    <div style={{ marginTop: "24px" }}>
      <div className={style.search}>
        <div className={style.label}>학생선택</div>
        <Autofill
          appearence="flat"
          options={props.users.map((val) => {
            return { text: val.userName, value: val.userId };
          })}
        />
      </div>
    </div>
  );
};

export default One;
