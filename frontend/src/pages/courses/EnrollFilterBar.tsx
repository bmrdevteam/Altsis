import Svg from "assets/svg/Svg";
import mergeStyle from "components/mergeFilter/mergeFilter.module.scss";
import style from "style/pages/enrollment.module.scss";

export type TEnrollColumnOption = {
  key: string;
  text: string;
};

type Props = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  columns: TEnrollColumnOption[];
  visibleKeys: Set<string>;
  onToggleColumn: (key: string) => void;
  onShowAll: () => void;
  onReset: () => void;
  onlyAvailable: boolean;
  onOnlyAvailableChange: (value: boolean) => void;
  availableCount: number;
  totalCount: number;
};

const CHIP_TONES = [
  style.enroll_filter_chip_enroll,
  style.enroll_filter_chip_full,
  style.enroll_filter_chip_duplication,
  style.enroll_filter_chip_enrolled,
  style.enroll_filter_chip_creditFull,
];

const EnrollFilterBar = ({
  keyword,
  onKeywordChange,
  columns,
  visibleKeys,
  onToggleColumn,
  onShowAll,
  onReset,
  onlyAvailable,
  onOnlyAvailableChange,
  availableCount,
  totalCount,
}: Props) => {
  const allColumnsVisible =
    columns.length > 0 && columns.every((c) => visibleKeys.has(c.key));
  const allActive = allColumnsVisible && !onlyAvailable;
  const hasAnyFilter =
    !!keyword.trim() || onlyAvailable || (!allColumnsVisible && columns.length > 0);

  return (
    <div className={style.enroll_filter_block}>
      <div className={mergeStyle.mergeSearchBar}>
        <div className={mergeStyle.mergeSearchInputWrap}>
          <span className={mergeStyle.mergeSearchIcon}>
            <Svg type="search" width="18px" height="18px" />
          </span>
          <input
            className={mergeStyle.mergeSearchInput}
            type="search"
            placeholder="수업명, 과목, 교사, 강의실, 시간 검색"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            aria-label="수강신청 검색"
          />
        </div>
      </div>

      <div
        className={style.enroll_filter_chip_row}
        role="group"
        aria-label="수강신청 보기 설정"
      >
        <button
          type="button"
          className={`${style.enroll_filter_chip} ${style.enroll_filter_chip_all} ${
            allActive ? style.enroll_filter_chip_active : ""
          }`}
          aria-pressed={allActive}
          onClick={onShowAll}
        >
          전체 {totalCount}
        </button>

        <button
          type="button"
          className={`${style.enroll_filter_chip} ${style.enroll_filter_chip_enroll} ${
            onlyAvailable ? style.enroll_filter_chip_active : ""
          }`}
          aria-pressed={onlyAvailable}
          onClick={() => onOnlyAvailableChange(!onlyAvailable)}
        >
          신청 가능 {availableCount}
        </button>

        {columns.map((col, i) => {
          const active = visibleKeys.has(col.key);
          return (
            <button
              key={col.key}
              type="button"
              className={`${style.enroll_filter_chip} ${
                CHIP_TONES[i % CHIP_TONES.length]
              } ${active ? style.enroll_filter_chip_active : ""}`}
              aria-pressed={active}
              onClick={() => onToggleColumn(col.key)}
            >
              {col.text}
            </button>
          );
        })}

        {hasAnyFilter && (
          <button
            type="button"
            className={style.enroll_filter_chip_reset}
            onClick={onReset}
          >
            초기화
          </button>
        )}
      </div>
    </div>
  );
};

export default EnrollFilterBar;
