import Item from "./Item";
import style from "./tree.module.scss";

type Props = {};

const Tree = (props: Props) => {
  return (
    <div className={style.tree}>
      <Item
        text={"item 1"}
        subItem={[
          <Item text={"item 1.1"} subItem={[<Item text={"item 1.1.1"} />]} />,
          <Item text={"item 1.2"} />,
          <Item text={"item 1.3"} />,
        ]}
      />
      <Item
        text={"item 2"}
        subItem={[
          <Item text={"item 2.1"} subItem={[<Item text={"item 2.1.1"} />]} />,
          <Item text={"item 2.2"} />,
          <Item text={"item 2.3"} />,
        ]}
      />
    </div>
  );
};

export default Tree;
