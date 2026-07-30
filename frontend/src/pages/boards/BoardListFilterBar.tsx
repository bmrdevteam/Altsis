import useOutsideClick from "hooks/useOutsideClick";
import Svg from "assets/svg/Svg";
import { TBoardScope, TBoardType } from "types/board";
import mergeStyle from "components/mergeFilter/mergeFilter.module.scss";
import bStyle from "./boards.module.scss";

export type TBoardScopeFilter = "" | TBoardScope;
export type TBoardTypeFilter = "" | TBoardType;

type Props = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  hasTodosOnly: boolean;
  onHasTodosOnlyChange: (value: boolean) => void;
  scopeFilter: TBoardScopeFilter;
  onScopeFilterChange: (value: TBoardScopeFilter) => void;
  boardTypeFilter: TBoardTypeFilter;
  onBoardTypeFilterChange: (value: TBoardTypeFilter) => void;
  onClear: () => void;
};

const SCOPE_OPTIONS: { value: TBoardScopeFilter; label: string }[] = [
  { value: "", label: "전체" },
  { value: "school", label: "학교" },
  { value: "season", label: "시즌" },
];

const TYPE_OPTIONS: { value: TBoardTypeFilter; label: string }[] = [
  { value: "", label: "전체" },
  { value: "official", label: "공식" },
  { value: "user", label: "사용자" },
];

const BoardListFilterBar = ({
  keyword,
  onKeywordChange,
  hasTodosOnly,
  onHasTodosOnlyChange,
  scopeFilter,
  onScopeFilterChange,
  boardTypeFilter,
  onBoardTypeFilterChange,
  onClear,
}: Props) => {
  const filterMenu = useOutsideClick();

  const hasDetailFilters =
    hasTodosOnly || !!scopeFilter || !!boardTypeFilter;
  const hasAnyFilter = !!keyword.trim() || hasDetailFilters;

  return (
    <div className={mergeStyle.mergeSearchBar} ref={filterMenu.RefObject}>
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
      <button
        type="button"
        className={`${mergeStyle.mergeFilterBtn} ${
          filterMenu.active || hasDetailFilters
            ? mergeStyle.mergeFilterBtnActive
            : ""
        }`}
        title="세부 필터"
        aria-expanded={filterMenu.active}
        onClick={() => filterMenu.setActive(!filterMenu.active)}
      >
        <Svg type="filter" width="18px" height="18px" />
      </button>
      {filterMenu.active && (
        <div className={mergeStyle.mergeFilterPanel}>
          <div className={mergeStyle.mergeFilterPanelHeader}>
            <span>세부 필터</span>
            {hasAnyFilter && (
              <button
                type="button"
                className={mergeStyle.mergeFilterReset}
                onClick={onClear}
              >
                초기화
              </button>
            )}
          </div>

          <div className={mergeStyle.mergeFilterRow}>
            <label className={bStyle.filterCheckRow}>
              <input
                type="checkbox"
                checked={hasTodosOnly}
                onChange={(e) => onHasTodosOnlyChange(e.target.checked)}
              />
              <span>할 일 있음</span>
            </label>
          </div>

          <div className={mergeStyle.mergeFilterRow}>
            <span className={mergeStyle.mergeFilterLabel}>범위</span>
            <div className={bStyle.filterOptionGroup} role="radiogroup" aria-label="범위">
              {SCOPE_OPTIONS.map((opt) => (
                <label key={opt.value || "all"} className={bStyle.filterOption}>
                  <input
                    type="radio"
                    name="boardScopeFilter"
                    checked={scopeFilter === opt.value}
                    onChange={() => onScopeFilterChange(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={mergeStyle.mergeFilterRow}>
            <span className={mergeStyle.mergeFilterLabel}>유형</span>
            <div className={bStyle.filterOptionGroup} role="radiogroup" aria-label="유형">
              {TYPE_OPTIONS.map((opt) => (
                <label key={opt.value || "all"} className={bStyle.filterOption}>
                  <input
                    type="radio"
                    name="boardTypeFilter"
                    checked={boardTypeFilter === opt.value}
                    onChange={() => onBoardTypeFilterChange(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardListFilterBar;
