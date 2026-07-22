import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import style from "./markdown.module.scss";

export type SlashCommandItem = {
  title: string;
  keywords: string[];
  command: () => void;
};

type Props = {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
};

const SlashCommandList = forwardRef((props: Props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex(
          (i) => (i + props.items.length - 1) % Math.max(props.items.length, 1)
        );
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % Math.max(props.items.length, 1));
        return true;
      }
      if (event.key === "Enter") {
        const item = props.items[selectedIndex];
        if (item) props.command(item);
        return true;
      }
      return false;
    },
  }));

  if (!props.items.length) {
    return (
      <div className={style.slashList}>
        <div className={style.slashEmpty}>검색 결과 없음</div>
      </div>
    );
  }

  return (
    <div className={style.slashList} data-editor-popup>
      {props.items.map((item, index) => (
        <button
          key={item.title}
          type="button"
          className={`${style.slashItem} ${
            index === selectedIndex ? style.slashItemActive : ""
          }`}
          onClick={() => props.command(item)}
        >
          {item.title}
        </button>
      ))}
    </div>
  );
});

SlashCommandList.displayName = "SlashCommandList";

export default SlashCommandList;
