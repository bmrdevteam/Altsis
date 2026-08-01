import style from "style/pages/enrollment.module.scss";

export type TEnrollColumnOption = {
  key: string;
  text: string;
};

type Props = {
  columns: TEnrollColumnOption[];
  visibleKeys: Set<string>;
  onToggleColumn: (key: string) => void;
  onShowAll: () => void;
  onReset: () => void;
  totalCount: number;
  /** 검색은 테이블 헤더로 옮긴 경우 — 칩만 표시 */
  keyword?: string;
  /** 수강신청 전용: 신청 가능 필터 */
  showOnlyAvailable?: boolean;
  onlyAvailable?: boolean;
  onOnlyAvailableChange?: (value: boolean) => void;
  availableCount?: number;
  ariaLabel?: string;
};

const CHIP_TONES = [
  style.enroll_filter_chip_enroll,
  style.enroll_filter_chip_full,
  style.enroll_filter_chip_duplication,
  style.enroll_filter_chip_enrolled,
  style.enroll_filter_chip_creditFull,
];

const EnrollFilterBar = ({
  columns,
  visibleKeys,
  onToggleColumn,
  onShowAll,
  onReset,
  totalCount,
  keyword = "",
  showOnlyAvailable = false,
  onlyAvailable = false,
  onOnlyAvailableChange,
  availableCount = 0,
  ariaLabel = "수업 목록 보기 설정",
}: Props) => {
  const allColumnsVisible =
    columns.length > 0 && columns.every((c) => visibleKeys.has(c.key));
  const allActive =
    allColumnsVisible && (!showOnlyAvailable || !onlyAvailable);
  const hasAnyFilter =
    !!keyword.trim() ||
    (showOnlyAvailable && onlyAvailable) ||
    (!allColumnsVisible && columns.length > 0);

  return (
    <div className={style.enroll_filter_block}>
      <div
        className={style.enroll_filter_chip_row}
        role="group"
        aria-label={ariaLabel}
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

        {showOnlyAvailable && onOnlyAvailableChange && (
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
        )}

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
