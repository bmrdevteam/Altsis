import Svg from "assets/svg/Svg";
import mergeStyle from "components/mergeFilter/mergeFilter.module.scss";
import bStyle from "../boards.module.scss";
import {
  ACTIVITY_CHIP_VISUAL,
  TActivityChipKey,
} from "./activityStatusVisual";

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

export type TActivityListSort =
  | "default"
  | "title"
  | "updatedAt"
  | "createdAt"
  | "closeAt"
  | "openAt";

const SORT_OPTIONS: { value: TActivityListSort; label: string }[] = [
  { value: "default", label: "기본 정렬" },
  { value: "title", label: "이름순" },
  { value: "updatedAt", label: "최근 수정순" },
  { value: "createdAt", label: "생성일순" },
  { value: "closeAt", label: "마감 임박순" },
  { value: "openAt", label: "시작일순" },
];

const CHIP_TONE_CLASS: Record<string, string> = {
  All: bStyle.filterChipToneAll,
  Approval: bStyle.filterChipToneApproval,
  Optional: bStyle.filterChipToneOptional,
  Submitted: bStyle.filterChipToneSubmitted,
  Closed: bStyle.filterChipToneClosed,
  Scheduled: bStyle.filterChipToneScheduled,
  Draft: bStyle.filterChipToneDraft,
  Direct: bStyle.filterChipToneDirect,
};

const CHIP_ORDER: Exclude<TActivityChipKey, "all">[] = [
  "todo",
  "open",
  "submitted",
  "closed",
  "scheduled",
  "draft",
  "direct",
];

type Props = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  sortBy: TActivityListSort;
  onSortByChange: (value: TActivityListSort) => void;
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
  sortBy,
  onSortByChange,
  viewFilter,
  onViewFilterChange,
  counts,
  onClear,
}: Props) => {
  const hasAnyFilter = !!keyword.trim() || !!viewFilter;
  const allChip = ACTIVITY_CHIP_VISUAL.all;

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
        <label className={bStyle.sortSelectWrap}>
          <span className={bStyle.sortSelectLabel}>정렬</span>
          <select
            className={bStyle.sortSelect}
            value={sortBy}
            onChange={(e) =>
              onSortByChange(e.target.value as TActivityListSort)
            }
            aria-label="활동 정렬"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className={bStyle.filterChipRow}
        role="radiogroup"
        aria-label="활동 보기"
      >
        <button
          type="button"
          className={`${bStyle.filterChip} ${CHIP_TONE_CLASS[allChip.tone]} ${
            viewFilter === "" ? bStyle.filterChipActive : ""
          }`}
          aria-pressed={viewFilter === ""}
          onClick={() => onViewFilterChange("")}
        >
          <ChipIcon type={allChip.icon} />
          {allChip.label}
        </button>
        {CHIP_ORDER.map((value) => {
          const chip = ACTIVITY_CHIP_VISUAL[value];
          const count = counts[value] || 0;
          if (count <= 0) return null;
          const active = viewFilter === value;
          return (
            <button
              key={value}
              type="button"
              className={`${bStyle.filterChip} ${CHIP_TONE_CLASS[chip.tone]} ${
                active ? bStyle.filterChipActive : ""
              }`}
              aria-pressed={active}
              onClick={() => onViewFilterChange(value)}
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
