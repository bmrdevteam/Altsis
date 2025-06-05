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
  // 1. 초기 inputValue 설정 개선:
  // defaultValue에 해당하는 text를 찾아 초기값으로 설정합니다.
  const [inputValue, setInputValue] = useState<string>(() => {
    if (props.defaultValue) {
      const defaultOption = props.options.find(
        (val) => val.value && val.value.toString() === props.defaultValue?.toString()
      );
      return defaultOption ? defaultOption.text : "";
    }
    return "";
  });
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
    // 2. useEffect의 defaultValue 처리 제거:
    // 이 부분은 이제 useState의 초기화 로직으로 대체됩니다.
    // props.setValue && props.setValue(props.defaultValue || "");

    return () => {
      document.removeEventListener("mousedown", handleMousedown);
    };
  }, []);

  useEffect(() => {
    if (props.onEdit) {
      props.onEdit(edit);
    }
  }, [edit]);

  // 현재 필터링된 옵션을 계산하는 헬퍼 함수
  const getFilteredOptions = (currentValue: string) => {
    return props.options.filter((val: { text: string; value: string | number }) => {
      if (currentValue === "") {
        return true;
      } else if (
        val.text &&
        val.text?.toLowerCase()?.includes(currentValue?.toLowerCase())
      ) {
        return true;
      }
      return false;
    });
  };

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
          const filtered = getFilteredOptions(e.target.value);

          if (filtered.length === 0) {
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
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            const filteredOptions = getFilteredOptions(inputValue);
            if (filteredOptions.length > 0) {
              const selectedValue = filteredOptions[0];
              setInputValue(selectedValue.text);
              props.onChange && props.onChange(selectedValue.value);
              props.setState && props.setState(selectedValue.value);
            }
            setEdit(false); // Enter 또는 Tab 키를 누르면 드롭다운 닫기
          }
        }}
        className={style.input}
        onFocus={() => {
          setEdit(true);
          // 1. 입력창이 클릭되면 입력창이 초기화되도록
          setInputValue(""); // 입력창 초기화
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
          {getFilteredOptions(inputValue).map((value, index) => {
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
          {getFilteredOptions(inputValue).map((value, index) => {
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