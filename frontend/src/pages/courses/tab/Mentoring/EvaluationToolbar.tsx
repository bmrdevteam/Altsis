import Svg from "assets/svg/Svg";
import mergeStyle from "components/mergeFilter/mergeFilter.module.scss";
import bStyle from "pages/boards/boards.module.scss";

export type TEvalColumnOption = {
  key: string;
  text: string;
};

type Props = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  columns: TEvalColumnOption[];
  visibleKeys: Set<string>;
  onToggle: (key: string) => void;
  onShowAll: () => void;
  onReset: () => void;
};

const CHIP_TONES = [
  bStyle.filterChipToneOptional,
  bStyle.filterChipToneSubmitted,
  bStyle.filterChipToneScheduled,
  bStyle.filterChipToneApproval,
  bStyle.filterChipTonePending,
  bStyle.filterChipToneDirect,
];

/**
 * 평가 탭: 학생 검색 + 평가 항목(열) 보기 칩
 */
const EvaluationToolbar = ({
  keyword,
  onKeywordChange,
  columns,
  visibleKeys,
  onToggle,
  onShowAll,
  onReset,
}: Props) => {
  const allVisible =
    columns.length > 0 && columns.every((c) => visibleKeys.has(c.key));
  const hasFilter = !!keyword.trim() || (!allVisible && columns.length > 0);

  return (
    <div className={bStyle.activityFilterBlock}>
      <div className={mergeStyle.mergeSearchBar}>
        <div className={mergeStyle.mergeSearchInputWrap}>
          <span className={mergeStyle.mergeSearchIcon}>
            <Svg type="search" width="18px" height="18px" />
          </span>
          <input
            className={mergeStyle.mergeSearchInput}
            type="search"
            placeholder="이름, ID, 학년 검색"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            aria-label="평가 학생 검색"
          />
        </div>
      </div>

      {columns.length > 0 && (
        <div
          className={bStyle.filterChipRow}
          role="group"
          aria-label="평가 항목 보기"
        >
          <button
            type="button"
            className={`${bStyle.filterChip} ${bStyle.filterChipToneAll} ${
              allVisible ? bStyle.filterChipActive : ""
            }`}
            aria-pressed={allVisible}
            onClick={onShowAll}
          >
            <span className={bStyle.filterChipIcon} aria-hidden>
              <Svg type="list" width="12px" height="12px" />
            </span>
            전체
          </button>

          {columns.map((col, i) => {
            const active = visibleKeys.has(col.key);
            return (
              <button
                key={col.key}
                type="button"
                className={`${bStyle.filterChip} ${
                  CHIP_TONES[i % CHIP_TONES.length]
                } ${active ? bStyle.filterChipActive : ""}`}
                aria-pressed={active}
                onClick={() => onToggle(col.key)}
              >
                {col.text}
              </button>
            );
          })}

          {hasFilter && (
            <button
              type="button"
              className={bStyle.filterChipReset}
              onClick={onReset}
            >
              초기화
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EvaluationToolbar;
