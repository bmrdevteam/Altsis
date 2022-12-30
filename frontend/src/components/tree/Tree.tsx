import style from "./tree.module.scss";
import Svg from "assets/svg/Svg";
import { useState } from "react";

type Props = {
  text: string;
  subItem?: JSX.Element[];
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
};

const TreeItem = (props: Props) => {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <div className={style.item}>
      <div
        className={style.content}
        onClick={(e) => {
          props.subItem && setOpen((prev) => !prev);
          props.onClick && props.onClick(e);
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

const Tree = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
  return <div className={style.tree}>{children}</div>;
};

export { TreeItem };
export default Tree;
