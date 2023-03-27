import React, { useEffect, useRef, useState } from "react";
import style from "./autoFill.module.scss";
type Props = {
  options: {
    text: string;
    value: string | number;
  }[];
  style?: any;
  ref?: any;
  label?: string;
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
  setValue?: any;
  setState?: React.Dispatch<React.SetStateAction<any>>;
  appearence?: "flat";
  resetOnClick?: boolean;
  onChange?: (value: string | number) => void;

  onEdit?: any;
};

const Autofill = (props: Props) => {
  const [inputValue, setInputValue] = useState<string>(
    props.defaultValue || ""
  );
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
    if (props.options) {
      props.setValue && props.setValue(props.defaultValue || "");
      setInputValue(
        props.options.filter((val) => {
          return (
            val.value && val.value.toString() === props.defaultValue?.toString()
          );
        })[0]?.text ?? ""
      );
    }

    return () => {
      document.removeEventListener("mousedown", handleMousedown);
    };
  }, []);

  useEffect(() => {
    if (props.onEdit) {
      props.onEdit(edit);
    }
  }, [edit]);

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
          borderRadius: props.style?.borderRadius,
          borderColor: !valid
            ? "var(--alert-c1)"
            : "var(--border-default-color)",
        }}
        placeholder={props.placeholder}
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (
            props.options.filter(
              (val: { text: string; value: string | number }) => {
                if (e.target.value === "") {
                  return val;
                } else if (
                  val.text.toLowerCase().includes(e.target.value.toLowerCase())
                ) {
                  return val;
                }
              }
            ).length === 0
          ) {
            setValid(false);
          } else {
            setValid(true);
          }
          const o = props.options.filter(
            (val: { text: string; value: string | number }) =>
              val.text.toLowerCase() === e.target.value.toLowerCase()
          );
          if (props.onChange && e.target.value !== "" && o.length > 0) {
            props.onChange(o[0].value);
          }

          if (props.required && e.target.value === "") {
            setValid(false);
          }
        }}
        onKeyDown={(e) => {
          // const inputText = e.currentTarget.value;
          // if (e.key === "Enter" || e.key === "Tab") {
          //   e.preventDefault();
          //   const newInput =
          //     props.options.filter(
          //       (val: { text: string; value: string | number }) => {
          //         return val.text
          //           .toLowerCase()
          //           ?.includes(inputText.toLowerCase());
          //       }
          //     )[0]?.text ?? "";
          //   setInputValue(newInput);
          // }
        }}
        className={style.input}
        onFocus={() => {
          setEdit(true);
        }}
      />

      {edit && (valid || inputValue !== "") && (
        <div
          className={style.options}
          style={{
            borderTop: "none",
            borderRadius: props.style?.borderRadius,
          }}
        >
          {props.options
            .filter((val: { text: string; value: string | number }) => {
              if (inputValue === "") {
                return true;
              } else if (
                val.text &&
                val.text?.toLowerCase()?.includes(inputValue?.toLowerCase())
              ) {
                return true;
              }
              return false;
            })
            .map((value, index) => {
              return (
                <div
                  key={index}
                  onClick={() => {
                    setInputValue(value.text);
                    props.onChange && props.onChange(value.value);
                    props.setState && props.setState(value.value);
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

      {edit && (valid || inputValue !== "") && props.resetOnClick && (
        <div
          className={style.options}
          style={{
            borderTop: "none",
            borderRadius: props.style?.borderRadius,
          }}
        >
          {props.options
            .filter((val: { text: string; value: string | number }) => {
              if (inputValue === "") {
                return true;
              } else if (
                val.text &&
                val.text?.toLowerCase()?.includes(inputValue?.toLowerCase())
              ) {
                return true;
              }
              return false;
            })
            .map((value, index) => {
              return (
                <div
                  key={index}
                  onClick={() => {
                    setInputValue("");
                    props.setState && props.setState(value.value);
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
