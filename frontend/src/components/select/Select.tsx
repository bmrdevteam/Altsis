import React, { useState } from "react";
import style from "./select.module.scss";
type Props = {
  options: {
    text: string;
    value: string | number;
  }[];
};

const Select = (props: Props) => {
  const [selected, setSelected] = useState<number>(0);
  const [edit, setEdit] = useState<boolean>(false);

  const Options = () => {
    return (
      <div className={style.options}>
        {props.options.map((value, index) => {
          return (
            <div
              onClick={() => {
                setSelected(index);
                setEdit(false);
              }}
              data-value={value.value}
              className={style.option}
              key={index}
            >
              {value.text}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={style.select}>
      <div
        className={style.selected}
        onClick={() => {
          setEdit(true);
        }}
      >
        {props.options[selected].text}
      </div>
      {edit && <Options />}
    </div>
  );
};

export default Select;
