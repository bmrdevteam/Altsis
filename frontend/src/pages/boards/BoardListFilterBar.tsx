import Svg from "assets/svg/Svg";
import { TBoardScope, TBoardType } from "types/board";
import mergeStyle from "components/mergeFilter/mergeFilter.module.scss";
import bStyle from "./boards.module.scss";

export type TBoardScopeFilter = "" | TBoardScope;
export type TBoardTypeFilter = "" | TBoardType;

export type TBoardListFilterCounts = {
  todos: number;
  school: number;
  season: number;
  official: number;
  user: number;
};

type Props = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  hasTodosOnly: boolean;
  onHasTodosOnlyChange: (value: boolean) => void;
  scopeFilter: TBoardScopeFilter;
  onScopeFilterChange: (value: TBoardScopeFilter) => void;
  boardTypeFilter: TBoardTypeFilter;
  onBoardTypeFilterChange: (value: TBoardTypeFilter) => void;
  counts: TBoardListFilterCounts;
  onClear: () => void;
};

const CHIP_TONE_CLASS: Record<string, string> = {
  All: bStyle.filterChipToneAll,
  Approval: bStyle.filterChipToneApproval,
  Optional: bStyle.filterChipToneOptional,
  Submitted: bStyle.filterChipToneSubmitted,
  Scheduled: bStyle.filterChipToneScheduled,
  Direct: bStyle.filterChipToneDirect,
};

const ChipIcon = ({ type }: { type: string }) => (
  <span className={bStyle.filterChipIcon} aria-hidden>
    <Svg type={type} width="12px" height="12px" />
  </span>
);

const BoardListFilterBar = ({
  keyword,
  onKeywordChange,
  hasTodosOnly,
  onHasTodosOnlyChange,
  scopeFilter,
  onScopeFilterChange,
  boardTypeFilter,
  onBoardTypeFilterChange,
  counts,
  onClear,
}: Props) => {
  const hasAnyFilter =
    !!keyword.trim() || hasTodosOnly || !!scopeFilter || !!boardTypeFilter;

  const isAllActive = !hasTodosOnly && !scopeFilter && !boardTypeFilter;

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
            placeholder="키워드 검색 (이름, 설명)"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
          />
        </div>
      </div>

      <div
        className={bStyle.filterChipRow}
        role="group"
        aria-label="보드 필터"
      >
        <button
          type="button"
          className={`${bStyle.filterChip} ${CHIP_TONE_CLASS.All} ${
            isAllActive ? bStyle.filterChipActive : ""
          }`}
          aria-pressed={isAllActive}
          onClick={() => {
            onHasTodosOnlyChange(false);
            onScopeFilterChange("");
            onBoardTypeFilterChange("");
          }}
        >
          <ChipIcon type="list" />
          전체
        </button>

        {counts.todos > 0 && (
          <button
            type="button"
            className={`${bStyle.filterChip} ${CHIP_TONE_CLASS.Approval} ${
              hasTodosOnly ? bStyle.filterChipActive : ""
            }`}
            aria-pressed={hasTodosOnly}
            onClick={() => onHasTodosOnlyChange(!hasTodosOnly)}
          >
            <ChipIcon type="list_check" />
            할 일 {counts.todos}
          </button>
        )}

        {counts.school > 0 && (
          <button
            type="button"
            className={`${bStyle.filterChip} ${CHIP_TONE_CLASS.Optional} ${
              scopeFilter === "school" ? bStyle.filterChipActive : ""
            }`}
            aria-pressed={scopeFilter === "school"}
            onClick={() =>
              onScopeFilterChange(scopeFilter === "school" ? "" : "school")
            }
          >
            <ChipIcon type="school" />
            학교 {counts.school}
          </button>
        )}

        {counts.season > 0 && (
          <button
            type="button"
            className={`${bStyle.filterChip} ${CHIP_TONE_CLASS.Scheduled} ${
              scopeFilter === "season" ? bStyle.filterChipActive : ""
            }`}
            aria-pressed={scopeFilter === "season"}
            onClick={() =>
              onScopeFilterChange(scopeFilter === "season" ? "" : "season")
            }
          >
            <ChipIcon type="calender" />
            시즌 {counts.season}
          </button>
        )}

        {counts.official > 0 && (
          <button
            type="button"
            className={`${bStyle.filterChip} ${CHIP_TONE_CLASS.Submitted} ${
              boardTypeFilter === "official" ? bStyle.filterChipActive : ""
            }`}
            aria-pressed={boardTypeFilter === "official"}
            onClick={() =>
              onBoardTypeFilterChange(
                boardTypeFilter === "official" ? "" : "official"
              )
            }
          >
            <ChipIcon type="check" />
            공식 {counts.official}
          </button>
        )}

        {counts.user > 0 && (
          <button
            type="button"
            className={`${bStyle.filterChip} ${CHIP_TONE_CLASS.Direct} ${
              boardTypeFilter === "user" ? bStyle.filterChipActive : ""
            }`}
            aria-pressed={boardTypeFilter === "user"}
            onClick={() =>
              onBoardTypeFilterChange(boardTypeFilter === "user" ? "" : "user")
            }
          >
            <ChipIcon type="user" />
            사용자 {counts.user}
          </button>
        )}

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

export default BoardListFilterBar;
