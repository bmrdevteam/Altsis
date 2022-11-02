import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Svg from "../../assets/svg/Svg";
import style from "./select.module.scss";
type Props = {
  options: {
    text: string;
    value: string | number;
  }[];
  style?: CSSProperties;
  ref?: any;
  label?: string;
  required?: boolean;

  defaultSelectedIndex?: number;
  defaultSelectedValue?: number | string;
  selectedValue?: string | number;

  setValue?: any;
  onChange?: any;
  appearence?: "flat";
};

/**
 *
 *
 *
 * @param options
 * @param style
 * @param ref
 * @param label
 * @param required
 * @param defaultSelected
 * @param setValue
 * @param onchange
 * @param appearence
 *
 * @returns
 *
 * @example <Select options={[{text:"",value:""},{text:"",value:""}]}/>
 */

const Select = (props: Props) => {
  const [selected, setSelected] = useState<number>(
    props.defaultSelectedValue
      ? props.options?.findIndex((e) => e.value === props.defaultSelectedValue)
      : props.defaultSelectedIndex
      ? props.defaultSelectedIndex
      : 0
  );

  const [edit, setEdit] = useState<boolean>(false);
  const selectRef = useRef<HTMLDivElement>(null);

  function handleMousedown(e: MouseEvent) {
    if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
      setEdit(false);
    }
  }
  useEffect(() => {
    document.addEventListener("mousedown", handleMousedown);
    props.setValue && props.setValue(props.options[selected].value);

    return () => {
      document.removeEventListener("mousedown", handleMousedown);
    };
  }, []);

  useEffect(() => {
    if (props.selectedValue) {
      setSelected(
        props.options.findIndex((val) => val.value === props.selectedValue)
      );
    }
  }, [props.selectedValue]);

  // useEffect(() => {
  //   if (selected >= 0 && typeof selected === "number") {
  //     props.onChange?.(props.options[selected].value);
  //   }
  //   console.log(selected);
  // }, [selected]);

  const Options = () => {
    return (
      <div className={style.options}>
        {props.options.map((value, index) => {
          return (
            <div
              onClick={() => {
                if (props.onChange && index !== selected) {
                  props.onChange(value.value);
                }
                setSelected(index);
                props.setValue && props.setValue(props.options[index].value);
              }}
              data-value={value?.value}
              className={style.option}
              key={index}
            >
              {value?.text}
            </div>
          );
        })}
      </div>
    );
  };
  return (
    <div
      ref={selectRef}
      className={`${style.select} ${props.appearence === "flat" && style.flat}`}
      style={{ width: props.style?.width, fontSize: props.style?.fontSize }}
    >
      {props.label && (
        <label className={style.label}>
          {props.label}
          {props.required && <span className={style.required}>*</span>}
        </label>
      )}
      <div
        ref={props.ref}
        className={style.selected}
        style={{ minWidth: props.style?.minWidth, width: props.style?.width }}
        onClick={() => {
          setEdit((prev) => !prev);
        }}
      >
        <span className={style.text}>{props.options[selected]?.text}</span>
        <span className={style.icon}>
          <Svg type={"chevronDown"} />
        </span>
        {edit && <Options />}
      </div>
    </div>
  );
};

export default Select;
