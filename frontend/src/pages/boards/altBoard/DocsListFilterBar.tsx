import useOutsideClick from "hooks/useOutsideClick";
import Svg from "assets/svg/Svg";
import DateRangeFilterDropdown, {
  DateRange,
} from "components/dateRangeFilter/DateRangeFilterDropdown";
import mergeStyle from "components/mergeFilter/mergeFilter.module.scss";
import bStyle from "../boards.module.scss";

type Props = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  unreadOnly: boolean;
  onUnreadOnlyChange: (value: boolean) => void;
  authorFilter: string;
  onAuthorFilterChange: (value: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (value: DateRange) => void;
  onClear: () => void;
};

const DocsListFilterBar = ({
  keyword,
  onKeywordChange,
  unreadOnly,
  onUnreadOnlyChange,
  authorFilter,
  onAuthorFilterChange,
  dateRange,
  onDateRangeChange,
  onClear,
}: Props) => {
  const filterMenu = useOutsideClick();

  const hasDetailFilters =
    unreadOnly || !!authorFilter.trim() || !!dateRange.from || !!dateRange.to;
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
          placeholder="키워드 검색 (제목, 작성자)"
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
                checked={unreadOnly}
                onChange={(e) => onUnreadOnlyChange(e.target.checked)}
              />
              <span>안 읽음만</span>
            </label>
          </div>

          <div className={mergeStyle.mergeFilterRow}>
            <label className={mergeStyle.mergeFilterLabel}>작성자</label>
            <input
              className={mergeStyle.mergeFilterFieldInput}
              placeholder="이름 또는 아이디"
              value={authorFilter}
              onChange={(e) => onAuthorFilterChange(e.target.value)}
            />
          </div>

          <div className={mergeStyle.mergeFilterRow}>
            <span className={mergeStyle.mergeFilterLabel}>작성일</span>
            <DateRangeFilterDropdown
              compact
              value={dateRange}
              onChange={onDateRangeChange}
              placeholder="날짜 필터"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DocsListFilterBar;
