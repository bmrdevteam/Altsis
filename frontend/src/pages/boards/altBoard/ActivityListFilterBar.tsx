import Svg from "assets/svg/Svg";
import mergeStyle from "components/mergeFilter/mergeFilter.module.scss";
import bStyle from "../boards.module.scss";

/** 배타 칩: 전체("") | 할 일 | 활동 상태 */
export type TActivityViewFilter =
  | ""
  | "todo"
  | "open"
  | "submitted"
  | "closed"
  | "scheduled"
  | "draft"
  | "direct";

export type TActivityViewCounts = Record<
  Exclude<TActivityViewFilter, "">,
  number
>;

type ChipDef = {
  value: Exclude<TActivityViewFilter, "">;
  label: string;
  toneClass: string;
  icon: string;
};

const CHIP_DEFS: ChipDef[] = [
  {
    value: "todo",
    label: "할 일",
    toneClass: bStyle.filterChipToneApproval,
    icon: "list_check",
  },
  {
    value: "open",
    label: "진행중",
    toneClass: bStyle.filterChipToneOptional,
    icon: "time",
  },
  {
    value: "submitted",
    label: "제출완료",
    toneClass: bStyle.filterChipToneSubmitted,
    icon: "checkboxChecked",
  },
  {
    value: "closed",
    label: "마감",
    toneClass: bStyle.filterChipToneClosed,
    icon: "archive",
  },
  {
    value: "scheduled",
    label: "예정",
    toneClass: bStyle.filterChipToneScheduled,
    icon: "calender",
  },
  {
    value: "draft",
    label: "비공개",
    toneClass: bStyle.filterChipTonePending,
    icon: "error",
  },
  {
    value: "direct",
    label: "직접입력",
    toneClass: bStyle.filterChipToneDirect,
    icon: "write",
  },
];

type Props = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  viewFilter: TActivityViewFilter;
  onViewFilterChange: (value: TActivityViewFilter) => void;
  counts: TActivityViewCounts;
  onClear: () => void;
};

const ChipIcon = ({ type }: { type: string }) => (
  <span className={bStyle.filterChipIcon} aria-hidden>
    <Svg type={type} width="12px" height="12px" />
  </span>
);

const ActivityListFilterBar = ({
  keyword,
  onKeywordChange,
  viewFilter,
  onViewFilterChange,
  counts,
  onClear,
}: Props) => {
  const hasAnyFilter = !!keyword.trim() || !!viewFilter;

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
            placeholder="키워드 검색 (제목, 설명)"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
          />
        </div>
      </div>

      <div
        className={bStyle.filterChipRow}
        role="radiogroup"
        aria-label="활동 보기"
      >
        <button
          type="button"
          className={`${bStyle.filterChip} ${bStyle.filterChipToneAll} ${
            viewFilter === "" ? bStyle.filterChipActive : ""
          }`}
          aria-pressed={viewFilter === ""}
          onClick={() => onViewFilterChange("")}
        >
          <ChipIcon type="list" />
          전체
        </button>
        {CHIP_DEFS.map((chip) => {
          const count = counts[chip.value] || 0;
          if (count <= 0) return null;
          const active = viewFilter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              className={`${bStyle.filterChip} ${chip.toneClass} ${
                active ? bStyle.filterChipActive : ""
              }`}
              aria-pressed={active}
              onClick={() => onViewFilterChange(chip.value)}
            >
              <ChipIcon type={chip.icon} />
              {chip.label} {count}
            </button>
          );
        })}
        {hasAnyFilter && (
          <button
            type="button"
            className={bStyle.filterChipReset}
            onClick={onClear}
          >
            초기화
          </button>
        )}
      </div>
    </div>
  );
};

export default ActivityListFilterBar;
