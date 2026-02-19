import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import style from "./markdown.module.scss";

export type MentionUser = {
  _id: string;
  userId: string;
  userName: string;
  profile?: string;
};

type Props = {
  items: MentionUser[];
  command: (item: { id: string; label: string }) => void;
};

const MentionList = forwardRef<any, Props>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      command({ id: item._id, label: item.userName });
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((prev) =>
          prev <= 0 ? items.length - 1 : prev - 1
        );
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) =>
          prev >= items.length - 1 ? 0 : prev + 1
        );
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className={style.mentionList}>
        <div className={style.mentionEmpty}>검색 결과 없음</div>
      </div>
    );
  }

  return (
    <div className={style.mentionList}>
      {items.map((item, index) => (
        <button
          key={item._id}
          type="button"
          className={`${style.mentionItem} ${
            index === selectedIndex ? style.mentionItemActive : ""
          }`}
          onClick={() => selectItem(index)}
        >
          <div className={style.mentionAvatar}>
            {item.profile ? (
              <img src={item.profile} alt="" />
            ) : (
              <span>{item.userName[0]}</span>
            )}
          </div>
          <div className={style.mentionInfo}>
            <span className={style.mentionName}>{item.userName}</span>
            <span className={style.mentionId}>{item.userId}</span>
          </div>
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = "MentionList";

export default MentionList;
