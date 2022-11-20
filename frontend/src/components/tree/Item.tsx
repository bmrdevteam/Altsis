import Svg from "assets/svg/Svg";
import { useState } from "react";
import style from "./tree.module.scss";
type Props = { text: string; subItem?: JSX.Element[] };

const Item = (props: Props) => {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <div className={style.item}>
      <div
        className={style.content}
        onClick={() => {
          props.subItem && setOpen((prev) => !prev);
        }}
      >
        <span className={style.text}>{props.text}</span>
        <span style={{ flex: "1 1 0" }}></span>
        <span className={style.icon}>
          {props.subItem && (
            <Svg
              type={open ? "minus" : "plus"}
              width={"14px"}
              height={"14px"}
            />
          )}
        </span>
      </div>
      {props.subItem &&
        open &&
        props.subItem.map((Element, index) => {
          return (
            <div className={style.subItem} key={index}>
              {Element}
            </div>
          );
        })}
    </div>
  );
};

export default Item;
