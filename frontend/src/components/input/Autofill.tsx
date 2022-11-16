import React, { useEffect, useRef, useState } from "react";
import style from "./autoFill.module.scss";
type Props = {
  options:
    | {
        text: string;
        value: string | number;
      }[];

  style?: any;
  ref?: any;
  label?: string;
  required?: boolean;
  defaultSelected?: number;
  setValue?: any;
  appearence?: "flat";
};

const Autofill = (props: Props) => {
  const [selected, setSelected] = useState<number>(
    props.defaultSelected ? props.defaultSelected : 0
  );
  const [inputValue, setInputValue] = useState(props.options[selected]?.text);
  const [valid, setValid] = useState(true);

  const [edit, setEdit] = useState<boolean>(false);
  const selectRef = useRef<HTMLDivElement>(null);

  function handleMousedown(e: MouseEvent) {
    if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
      setEdit(false);
    }
  }
  useEffect(() => {
    document.addEventListener("mousedown", handleMousedown);
    props.defaultSelected && setSelected(props.defaultSelected);
    props.setValue && props.setValue(props.options[selected].value);

    return () => {
      document.removeEventListener("mousedown", handleMousedown);
    };
  }, []);

  useEffect(() => {
    if (
      props.options.filter((val: { text: string; value: string | number }) => {
        if (inputValue === "") {
          return val;
        } else if (val.text.toLowerCase().includes(inputValue.toLowerCase())) {
          return val;
        }
      }).length === 0
    ) {
      setValid(false);
    } else {
      setValid(true);
    }

    if (props.required && inputValue === "") {
      setValid(false);
    }
  }, [inputValue]);

  return (
    <div
      style={props.style}
      className={`${style.input_container} ${
        props.appearence === "flat" && style.flat
      }`}
      ref={selectRef}
    >
      {props.label && (
        <label className={style.label}>
          {props.label}
          {props.required && <span className={style.required}>*</span>}
        </label>
      )}
      <input
        style={{
          borderColor: !valid
            ? "var(--alert-c1)"
            : "var(--border-default-color)",
        }}
        type="text"
        // value={}
        onChange={(e) => {
          setInputValue(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEdit(false);
          }
        }}
        className={style.input}
        value={inputValue}
        onFocus={() => {
          setEdit(true);
        }}
      />

      {edit && (valid || inputValue === "") && (
        <div className={style.options}>
          {props.options
            .filter((val: { text: string; value: string | number }) => {
              if (inputValue === "") {
                return val;
              } else if (
                val.text.toLowerCase().includes(inputValue.toLowerCase())
              ) {
                return val;
              }
            })
            .map((value, index) => {
              return (
                <div
                  key={index}
                  onClick={() => {
                    setInputValue(value.text);
                    setEdit(false);
                  }}
                  className={style.option}
                >
                  {value.text}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default Autofill;
