import React, { useEffect, useRef, useState } from "react";
import style from "./autoFill.module.scss";

type Props = {
  options: {
    text: string;
    value: string | number;
  }[];
  style?: React.CSSProperties; // style prop 타입을 React.CSSProperties로 변경
  ref?: React.Ref<HTMLDivElement>; // ref prop 타입을 React.Ref로 변경
  label?: string;
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
  setValue?: (value: string | number) => void; // setValue prop 타입을 명확히
  setState?: React.Dispatch<React.SetStateAction<any>>;
  appearence?: "flat";
  resetOnClick?: boolean;
  onChange?: (value: string | number) => void;
  onEdit?: (isEditing: boolean) => void;
};

const Autofill = (props: Props) => {
  const [inputValue, setInputValue] = useState<string>(
    props.defaultValue || ""
  );
  const [valid, setValid] = useState(true);
  const [edit, setEdit] = useState<boolean>(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // 컴포넌트 마운트 시 defaultValue 설정 및 외부 클릭 감지
  useEffect(() => {
    document.addEventListener("mousedown", handleMousedown);

    if (props.options && props.defaultValue !== undefined) {
      const defaultOption = props.options.find(
        (val) => val.value?.toString() === props.defaultValue?.toString()
      );
      if (defaultOption) {
        setInputValue(defaultOption.text);
        props.setValue && props.setValue(defaultOption.value);
      } else {
        // defaultValue가 options에 없는 경우 입력 필드를 비움
        setInputValue("");
        props.setValue && props.setValue("");
      }
    } else if (props.defaultValue === undefined) {
      setInputValue("");
      props.setValue && props.setValue("");
    }

    return () => {
      document.removeEventListener("mousedown", handleMousedown);
    };
  }, [props.options, props.defaultValue]); // 의존성 배열에 props.options와 props.defaultValue 추가

  // edit 상태 변경 시 onEdit 콜백 호출
  useEffect(() => {
    if (props.onEdit) {
      props.onEdit(edit);
    }
  }, [edit, props.onEdit]); // 의존성 배열에 props.onEdit 추가

  // 외부 클릭 감지 핸들러
  function handleMousedown(e: MouseEvent) {
    if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
      setEdit(false);
      // 포커스가 사라질 때 현재 입력값의 유효성을 다시 확인하고, 유효하지 않으면 비워줍니다.
      const matchedOption = props.options.find(
        (option) => option.text.toLowerCase() === inputValue.toLowerCase()
      );
      if (!matchedOption && inputValue !== "") {
        setInputValue("");
        props.onChange && props.onChange(""); // 값도 초기화
        props.setValue && props.setValue("");
        props.setState && props.setState("");
      }
      setValid(true); // 외부 클릭 시 유효성 상태 초기화
    }
  }

  // 입력 필드 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // 유효성 검사 및 onChange 호출
    const matchedOptions = props.options.filter((val) =>
      val.text.toLowerCase().includes(value.toLowerCase())
    );
    const exactMatch = props.options.find(
      (val) => val.text.toLowerCase() === value.toLowerCase()
    );

    if (props.required && value === "") {
      setValid(false);
      props.onChange && props.onChange("");
      props.setValue && props.setValue("");
    } else if (value !== "" && matchedOptions.length === 0) {
      setValid(false);
      props.onChange && props.onChange(""); // 유효하지 않은 값일 경우 초기화
      props.setValue && props.setValue("");
    } else {
      setValid(true);
      if (exactMatch) {
        props.onChange && props.onChange(exactMatch.value);
        props.setValue && props.setValue(exactMatch.value);
      } else if (value === "") {
        props.onChange && props.onChange("");
        props.setValue && props.setValue("");
      }
    }
  };

  // 키 다운 핸들러 (Enter, Tab 처리)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const inputText = e.currentTarget.value;
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const filteredOptions = props.options.filter((val) =>
        val.text.toLowerCase().includes(inputText.toLowerCase())
      );

      if (filteredOptions.length > 0) {
        // 가장 첫 번째 일치하는 옵션으로 설정
        const selectedOption = filteredOptions[0];
        setInputValue(selectedOption.text);
        props.onChange && props.onChange(selectedOption.value);
        props.setValue && props.setValue(selectedOption.value);
        props.setState && props.setState(selectedOption.value);
        setValid(true);
      } else if (props.required && inputText === "") {
        setValid(false);
      } else {
        // 일치하는 항목이 없으면 입력 필드를 비움 (선택 사항)
        setInputValue("");
        props.onChange && props.onChange("");
        props.setValue && props.setValue("");
        props.setState && props.setState("");
        setValid(false); // 유효하지 않은 상태로 설정
      }
      setEdit(false); // Enter 또는 Tab 키 누르면 드롭다운 닫기
    }
  };

  // 옵션 클릭 핸들러
  const handleOptionClick = (value: { text: string; value: string | number }) => {
    if (props.resetOnClick) {
      setInputValue(""); // resetOnClick이 true면 입력 필드 비움
      props.onChange && props.onChange(""); // 값도 초기화
      props.setValue && props.setValue("");
      props.setState && props.setState(value.value); // 하지만 setState는 클릭된 값을 전달
    } else {
      setInputValue(value.text);
      props.onChange && props.onChange(value.value);
      props.setValue && props.setValue(value.value);
      props.setState && props.setState(value.value);
    }
    setEdit(false);
    setValid(true); // 옵션 선택 시 유효성 상태를 true로 변경
  };

  // 필터링된 옵션 목록 가져오기
  const getFilteredOptions = () => {
    return props.options.filter((val: { text: string; value: string | number }) => {
      if (inputValue === "") {
        return true;
      } else if (
        val.text &&
        val.text?.toLowerCase()?.includes(inputValue?.toLowerCase())
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
        onChange={handleInputChange}
        onKeyDown={handleKeyDown} // 활성화된 onKeyDown 핸들러
        className={style.input}
        onFocus={() => {
          setEdit(true);
          setValid(true); // 포커스 시 유효성 초기화
        }}
      />

      {edit && (valid || inputValue !== "") && getFilteredOptions().length > 0 && (
        <div
          className={style.options}
          style={{
            borderTop: "none",
            borderRadius: props.style?.borderRadius,
          }}
        >
          {getFilteredOptions().map((value, index) => (
            <div
              key={index}
              onClick={() => handleOptionClick(value)}
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