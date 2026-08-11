import Svg from "assets/svg/Svg";
import { TBoardLinkFilter, TBoardScope, TBoardType } from "types/board";
import mergeStyle from "components/mergeFilter/mergeFilter.module.scss";
import bStyle from "./boards.module.scss";

export type TBoardScopeFilter = "" | TBoardScope;
export type TBoardTypeFilter = "" | TBoardType;

export type TBoardListSort =
  | "default"
  | "name"
  | "updatedAt"
  | "createdAt"
  | "postCount"
  | "creatorName";

export type TBoardListFilterCounts = {
  todos: number;
  school: number;
  season: number;
  official: number;
  user: number;
  syllabus: number;
  general: number;
};

const SORT_OPTIONS: { value: TBoardListSort; label: string }[] = [
  { value: "default", label: "기본 정렬" },
  { value: "name", label: "이름순" },
  { value: "updatedAt", label: "최근 활동순" },
  { value: "createdAt", label: "생성일순" },
  { value: "postCount", label: "게시글 많은순" },
  { value: "creatorName", label: "생성자순" },
];

type Props = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  sortBy: TBoardListSort;
  onSortByChange: (value: TBoardListSort) => void;
  hasTodosOnly: boolean;
  onHasTodosOnlyChange: (value: boolean) => void;
  scopeFilter: TBoardScopeFilter;
  onScopeFilterChange: (value: TBoardScopeFilter) => void;
  boardTypeFilter: TBoardTypeFilter;
  onBoardTypeFilterChange: (value: TBoardTypeFilter) => void;
  linkFilter: TBoardLinkFilter;
  onLinkFilterChange: (value: TBoardLinkFilter) => void;
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
  Pending: bStyle.filterChipTonePending,
};

const ChipIcon = ({ type }: { type: string }) => (
  <span className={bStyle.filterChipIcon} aria-hidden>
    <Svg type={type} width="12px" height="12px" />
  </span>
);

const BoardListFilterBar = ({
  keyword,
  onKeywordChange,
  sortBy,
  onSortByChange,
  hasTodosOnly,
  onHasTodosOnlyChange,
  scopeFilter,
  onScopeFilterChange,
  boardTypeFilter,
  onBoardTypeFilterChange,
  linkFilter,
  onLinkFilterChange,
  counts,
  onClear,
}: Props) => {
  const hasAnyFilter =
    !!keyword.trim() ||
    hasTodosOnly ||
    !!scopeFilter ||
    !!boardTypeFilter ||
    !!linkFilter;

  const isAllActive =
    !hasTodosOnly && !scopeFilter && !boardTypeFilter && !linkFilter;

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
            placeholder="키워드 검색 (이름, 설명, 생성자)"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
          />
        </div>
        <label className={bStyle.sortSelectWrap}>
          <span className={bStyle.sortSelectLabel}>정렬</span>
          <select
            className={bStyle.sortSelect}
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as TBoardListSort)}
            aria-label="보드 정렬"
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
            onLinkFilterChange("");
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

        {counts.syllabus > 0 && (
          <button
            type="button"
            className={`${bStyle.filterChip} ${CHIP_TONE_CLASS.Pending} ${
              linkFilter === "syllabus" ? bStyle.filterChipActive : ""
            }`}
            aria-pressed={linkFilter === "syllabus"}
            onClick={() =>
              onLinkFilterChange(linkFilter === "syllabus" ? "" : "syllabus")
            }
          >
            <ChipIcon type="file" />
            수업 {counts.syllabus}
          </button>
        )}

        {counts.general > 0 && counts.syllabus > 0 && (
          <button
            type="button"
            className={`${bStyle.filterChip} ${CHIP_TONE_CLASS.Optional} ${
              linkFilter === "general" ? bStyle.filterChipActive : ""
            }`}
            aria-pressed={linkFilter === "general"}
            onClick={() =>
              onLinkFilterChange(linkFilter === "general" ? "" : "general")
            }
          >
            <ChipIcon type="list" />
            일반 {counts.general}
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
