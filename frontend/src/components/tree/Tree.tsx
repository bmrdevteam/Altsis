import { isArray } from "lodash";
import style from "./tree.module.scss";

import Item1 from "./Item1";

type Props = {
  data: any[];
};

const Tree = (props: Props) => {
  console.log("tree", props.data);

  return (
    <div className={style.tree}>
      {isArray(props.data) &&
        props.data.map((value: any, index: number) => {
          if (index === 0) {
            return value.map((v: string, i: number) => {
              return (
                <Item1
                  text={v}
                  key={i}
                  depth={index}
                  order={10 ** props.data.length * (i + 1)}
                />
              );
            });
          }
          const keys = Object.keys(value);

          return keys.map((v: any, i: number) => {
            return props.data[index][v].map((v2: string, i2: number) => {
              let order = 0;
            //   order =
                // 10 ** props.data.length *
                // (props.data[0].findIndex(
                //   (val: any) => val === v.split("/")[0]
                // ) +
                //   1);
                order += 10 ** index
                order += 10 ** (props.data.length - index) * (i2 + 1);
              return (
                // v.split("/")[index-1]
                <Item1
                  text={`${v2}-------`}
                  key={i2}
                  depth={index}
                  order={order}
                />
              );
            });
          });
        })}
    </div>
  );
};

export default Tree;
