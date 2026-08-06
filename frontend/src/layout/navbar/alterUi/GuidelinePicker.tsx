import GuidelinePickRow from "./GuidelinePickRow";
import { TGuidelineItem } from "./types";
import style from "../Alter.module.scss";

type Props = {
  items: TGuidelineItem[];
  selectedIds: string[];
  expandedId: string | null;
  loading?: boolean;
  loadingText?: string;
  emptyText: string;
  scroll?: boolean;
  /** expanded 키 prefix (학습정보와 지침 id 충돌 방지) */
  expandKeyPrefix?: string;
  onToggleChecked: (id: string) => void;
  onToggleExpanded: (expandKey: string) => void;
};

const GuidelinePicker = ({
  items,
  selectedIds,
  expandedId,
  loading,
  loadingText = "지침을 불러오는 중...",
  emptyText,
  scroll,
  expandKeyPrefix = "",
  onToggleChecked,
  onToggleExpanded,
}: Props) => {
  if (loading) {
    return <p className={style.prepText}>{loadingText}</p>;
  }
  if (items.length === 0) {
    return <p className={style.prepText}>{emptyText}</p>;
  }
  const listClass = scroll
    ? `${style.refList} ${style.refListScroll}`
    : style.refList;
  return (
    <div className={listClass}>
      {items.map((item) => {
        const expandKey = `${expandKeyPrefix}${item._id}`;
        return (
          <GuidelinePickRow
            key={item._id}
            id={expandKey}
            title={item.title}
            content={item.content}
            checked={selectedIds.includes(item._id)}
            expanded={expandedId === expandKey}
            onToggleChecked={() => onToggleChecked(item._id)}
            onToggleExpanded={() => onToggleExpanded(expandKey)}
          />
        );
      })}
    </div>
  );
};

export default GuidelinePicker;
