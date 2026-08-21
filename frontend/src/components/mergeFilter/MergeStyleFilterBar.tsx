import useOutsideClick from "hooks/useOutsideClick";
import Svg from "assets/svg/Svg";
import DateRangeFilterDropdown, {
  DateRange,
} from "components/dateRangeFilter/DateRangeFilterDropdown";
import style from "./mergeFilter.module.scss";

export type MergeFilterField = {
  key: string;
  label: string;
  type?: string;
};

type Props = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  keywordPlaceholder?: string;
  textFilters: Record<string, string>;
  onTextFilterChange: (key: string, value: string) => void;
  dateFilters: Record<string, DateRange>;
  onDateFilterChange: (key: string, range: DateRange) => void;
  fields: MergeFilterField[];
  respondentFilterKey?: string;
  showRespondentFilter?: boolean;
  onClear: () => void;
};

const MergeStyleFilterBar = ({
  keyword,
  onKeywordChange,
  keywordPlaceholder = "키워드 검색",
  textFilters,
  onTextFilterChange,
  dateFilters,
  onDateFilterChange,
  fields,
  respondentFilterKey = "_respondentName",
  showRespondentFilter = true,
  onClear,
}: Props) => {
  const filterMenu = useOutsideClick();

  const hasDetailFilters =
    Object.values(textFilters).some((v) => v) ||
    Object.values(dateFilters).some((r) => r.from || r.to);

  const hasAnyFilter = !!keyword.trim() || hasDetailFilters;

  return (
    <div className={style.mergeSearchBar} ref={filterMenu.RefObject}>
      <div className={style.mergeSearchInputWrap}>
        <span className={style.mergeSearchIcon}>
          <Svg type="search" width="18px" height="18px" />
        </span>
        <input
          className={style.mergeSearchInput}
          type="search"
          aria-label="키워드 검색"
          placeholder={keywordPlaceholder}
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
      </div>
      <button
        type="button"
        className={`${style.mergeFilterBtn} ${
          filterMenu.active || hasDetailFilters
            ? style.mergeFilterBtnActive
            : ""
        }`}
        title="세부 필터"
        aria-label="세부 필터"
        aria-expanded={filterMenu.active}
        onClick={() => filterMenu.setActive(!filterMenu.active)}
      >
        <Svg type="filter" width="18px" height="18px" />
      </button>
      {filterMenu.active && (
        <div className={style.mergeFilterPanel}>
          <div className={style.mergeFilterPanelHeader}>
            <span>세부 필터</span>
            {hasAnyFilter && (
              <button
                type="button"
                className={style.mergeFilterReset}
                onClick={onClear}
              >
                초기화
              </button>
            )}
          </div>
          {showRespondentFilter && (
            <div className={style.mergeFilterRow}>
              <label className={style.mergeFilterLabel}>응답자</label>
              <input
                className={style.mergeFilterFieldInput}
                placeholder="검색..."
                value={textFilters[respondentFilterKey] || ""}
                onChange={(e) =>
                  onTextFilterChange(respondentFilterKey, e.target.value)
                }
              />
            </div>
          )}
          {fields.map((field) => (
            <div key={field.key} className={style.mergeFilterRow}>
              <label className={style.mergeFilterLabel}>{field.label}</label>
              {field.type === "date" || field.type === "multiDate" ? (
                <DateRangeFilterDropdown
                  compact
                  value={dateFilters[field.key] || { from: "", to: "" }}
                  onChange={(range) => onDateFilterChange(field.key, range)}
                  placeholder="날짜 필터"
                />
              ) : (
                <input
                  className={style.mergeFilterFieldInput}
                  placeholder="검색..."
                  value={textFilters[field.key] || ""}
                  onChange={(e) =>
                    onTextFilterChange(field.key, e.target.value)
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MergeStyleFilterBar;
