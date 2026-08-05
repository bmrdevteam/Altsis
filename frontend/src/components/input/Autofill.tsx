import React, { useEffect, useRef, useState } from "react";
import style from "./autoFill.module.scss";

type Option = {
  text: string;
  value: string | number;
};

type Props = {
  options: Option[];
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
  const [inputValue, setInputValue] = useState<string>(() => {
    if (props.defaultValue) {
      const defaultOption = props.options.find(
        (val) =>
          val.value && val.value.toString() === props.defaultValue?.toString()
      );
      return defaultOption ? defaultOption.text : "";
    }
    return "";
  });
  const [valid, setValid] = useState(true);
  const [edit, setEdit] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);

  function handleMousedown(e: MouseEvent) {
    if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
      setEdit(false);
    }
  }

  useEffect(() => {
    document.addEventListener("mousedown", handleMousedown);
    return () => {
      document.removeEventListener("mousedown", handleMousedown);
    };
  }, []);

  useEffect(() => {
    if (props.onEdit) {
      props.onEdit(edit);
    }
  }, [edit]);

  const getFilteredOptions = (currentValue: string) => {
    return props.options.filter((val: Option) => {
      if (currentValue === "") return true;
      return (
        !!val.text &&
        val.text.toLowerCase().includes(currentValue.toLowerCase())
      );
    });
  };

  const applyOption = (option: Option) => {
    // 한글 IME 조합 중 확정 글자가 뒤에 붙지 않도록 blur 후 값 설정
    inputRef.current?.blur();
    composingRef.current = false;
    // resetOnClick: 목록에 추가 후 검색창을 비움
    setInputValue(props.resetOnClick ? "" : option.text);
    props.onChange?.(option.value);
    props.setState?.(option.value);
    setEdit(false);
    setValid(true);
  };

  const showOptions = edit && (valid || inputValue !== "");
  const filteredOptions = getFilteredOptions(inputValue);

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
        ref={inputRef}
        style={{
          borderRadius: props.style?.borderRadius,
          borderColor: !valid
            ? "var(--alert-c1)"
            : "var(--border-default-color)",
        }}
        placeholder={props.placeholder}
        type="text"
        value={inputValue}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
        }}
        onChange={(e) => {
          setInputValue(e.target.value);
          const filtered = getFilteredOptions(e.target.value);

          if (filtered.length === 0) {
            setValid(false);
          } else {
            setValid(true);
          }
          const o = props.options.filter(
            (val: Option) =>
              !!val.text &&
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
          // 한글 IME 조합 중 Enter/Tab은 조합 확정용 — 자동완성 확정하지 않음
          if (e.nativeEvent.isComposing || composingRef.current) {
            return;
          }
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            const options = getFilteredOptions(inputValue);
            if (options.length > 0) {
              applyOption(options[0]);
            } else {
              setEdit(false);
            }
          }
        }}
        className={style.input}
        onFocus={() => {
          setEdit(true);
          setInputValue("");
        }}
      />

      {showOptions && (
        <div
          className={style.options}
          style={{
            borderTop: "none",
            borderRadius: props.style?.borderRadius,
          }}
        >
          {filteredOptions.map((value, index) => (
            <div
              key={`${value.value}_${index}`}
              // mousedown + preventDefault: click 전에 포커스를 빼 IME 잔여 입력 방지
              onMouseDown={(e) => {
                e.preventDefault();
                applyOption(value);
              }}
              className={style.option}
            >
              {value.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Autofill;
