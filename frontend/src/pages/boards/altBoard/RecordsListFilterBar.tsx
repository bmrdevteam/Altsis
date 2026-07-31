import Svg from "assets/svg/Svg";
import mergeStyle from "components/mergeFilter/mergeFilter.module.scss";
import bStyle from "../boards.module.scss";

/** 배타 칩: 전체("") | 공유 | 퀴즈 | 평가 | 승인 | 직접입력 */
export type TRecordsViewFilter =
  | ""
  | "shared"
  | "quiz"
  | "assessment"
  | "approval"
  | "direct";

export type TRecordsViewCounts = Record<
  Exclude<TRecordsViewFilter, "">,
  number
>;

const CHIP_TONE_CLASS: Record<string, string> = {
  All: bStyle.filterChipToneAll,
  Optional: bStyle.filterChipToneOptional,
  Draft: bStyle.filterChipToneDraft,
  Scheduled: bStyle.filterChipToneScheduled,
  Approval: bStyle.filterChipToneApproval,
  Direct: bStyle.filterChipToneDirect,
};

const CHIP_VISUAL: Record<
  Exclude<TRecordsViewFilter, "">,
  { label: string; icon: string; tone: string }
> = {
  shared: { label: "공유", icon: "link", tone: "Optional" },
  quiz: { label: "퀴즈", icon: "check", tone: "Draft" },
  assessment: { label: "평가", icon: "edit", tone: "Scheduled" },
  approval: { label: "승인", icon: "list_check", tone: "Approval" },
  direct: { label: "직접입력", icon: "table", tone: "Direct" },
};

const CHIP_ORDER: Exclude<TRecordsViewFilter, "">[] = [
  "shared",
  "quiz",
  "assessment",
  "approval",
  "direct",
];

type Props = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  viewFilter: TRecordsViewFilter;
  onViewFilterChange: (value: TRecordsViewFilter) => void;
  counts: TRecordsViewCounts;
  onClear: () => void;
};

const ChipIcon = ({ type }: { type: string }) => (
  <span className={bStyle.filterChipIcon} aria-hidden>
    <Svg type={type} width="12px" height="12px" />
  </span>
);

const RecordsListFilterBar = ({
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
        aria-label="기록 보기"
      >
        <button
          type="button"
          className={`${bStyle.filterChip} ${CHIP_TONE_CLASS.All} ${
            viewFilter === "" ? bStyle.filterChipActive : ""
          }`}
          aria-pressed={viewFilter === ""}
          onClick={() => onViewFilterChange("")}
        >
          <ChipIcon type="list" />
          전체
        </button>
        {CHIP_ORDER.map((value) => {
          const chip = CHIP_VISUAL[value];
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

export default RecordsListFilterBar;
