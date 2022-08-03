import { useState } from "react";
import style from "./list.module.scss";

interface IListDataHeader {
  text: string;
  value: string;
}

const List = ({
  header,
  data,
  widthRatio,
}: {
  header: IListDataHeader[];
  data: {}[];
  widthRatio: number[];
}) => {
  const [orderBy, setOrderBy] = useState();

  const ListHeader = () => {
    return (
      <div className={style.list_header}>
        {header.map((value, index) => {
          return (
            <div key={index} style={{ flex: `${widthRatio[index]} 1 0` }}>
              {value.text}
            </div>
          );
        })}
      </div>
    );
  };
  const ListItem = ({ listItemData }: { listItemData: {} }) => {
    return (
      <div className={style.list_item}>
        {header.map((value, index) => {
          return (
            <div key={index} style={{ flex: `${widthRatio[index]} 1 0` }}>
              {listItemData[value.value as keyof typeof listItemData]}
            </div>
          );
        })}
      </div>
    );
  };
  return (
    <div className={style.list}>
      <ListHeader />
      {data.map((value, index) => {
        return <ListItem  key={index} listItemData={value} />;
      })}
    </div>
  );
};

export default List;
