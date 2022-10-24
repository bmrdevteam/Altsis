import style from "./tree.module.scss";
type Props = { text: string; depth: number; order: number };

const Item1 = (props: Props) => {
  return (
    <div
      className={style.item}
      style={{ marginLeft: `${props.depth * 12}px`, order: props.order }}
    >
      <span className={style.icon}>+</span>
      <span className={style.text}>
        {props.text}
        {props.order}
      </span>
    </div>
  );
};

export default Item1;
