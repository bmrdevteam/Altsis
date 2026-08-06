import style from "../Alter.module.scss";

type Props = {
  id: string;
  title: string;
  content?: string;
  checked: boolean;
  expanded: boolean;
  onToggleChecked: () => void;
  onToggleExpanded: () => void;
};

/** 작성 지침 선택 행 — 체크는 선택, 제목 클릭 시 본문 펼침 */
const GuidelinePickRow = ({
  id,
  title,
  content,
  checked,
  expanded,
  onToggleChecked,
  onToggleExpanded,
}: Props) => {
  const bodyId = `${id}-guideline-body`;
  return (
    <div className={style.guidelineRow}>
      <div className={style.guidelineRowMain}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleChecked}
          aria-label={`${title} 선택`}
        />
        <button
          type="button"
          className={style.guidelineToggle}
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls={bodyId}
        >
          <span className={style.guidelineTitle}>{title}</span>
        </button>
      </div>
      {expanded && content ? (
        <div id={bodyId} className={style.guidelineBody}>
          {content}
        </div>
      ) : null}
    </div>
  );
};

export default GuidelinePickRow;
