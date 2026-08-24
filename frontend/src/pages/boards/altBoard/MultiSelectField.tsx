import { useMemo, useState } from "react";
import style from "./altBoard.module.scss";
import {
  filterOptionIndices,
  isAllVisibleSelected,
  toggleSelectAllVisible,
  type TCheckFilter,
} from "./multiSelectOptions";

type Props = {
  fieldId: string;
  options: string[];
  selected: string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
};

const CHECK_FILTERS: { id: TCheckFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "checked", label: "선택됨" },
  { id: "unchecked", label: "미선택" },
];

const emptyListMessage = (
  optionsLength: number,
  checkFilter: TCheckFilter
): string => {
  if (optionsLength === 0) return "선택지가 없습니다.";
  if (checkFilter === "checked") return "선택한 항목이 없습니다.";
  if (checkFilter === "unchecked") return "선택하지 않은 항목이 없습니다.";
  return "검색 결과가 없습니다.";
};

const MultiSelectField = ({
  fieldId,
  options,
  selected,
  disabled = false,
  onChange,
}: Props) => {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const [checkFilter, setCheckFilter] = useState<TCheckFilter>("all");

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const checkedCount = useMemo(
    () => options.filter((opt) => selectedSet.has(opt)).length,
    [options, selectedSet]
  );
  const uncheckedCount = Math.max(0, options.length - checkedCount);

  const filterCounts: Record<TCheckFilter, number> = {
    all: options.length,
    checked: checkedCount,
    unchecked: uncheckedCount,
  };

  const filteredIndices = useMemo(
    () => filterOptionIndices(options, query, checkFilter, selected),
    [options, query, checkFilter, selected]
  );
  const visibleOptions = filteredIndices.map((i) => options[i]);
  const allVisibleSelected = isAllVisibleSelected(selected, visibleOptions);
  const narrowed = query.trim().length > 0 || checkFilter !== "all";

  return (
    <div className={style.multiSelectField}>
      <div className={style.multiSelectHeader}>
        <button
          type="button"
          className={style.multiSelectCollapseBtn}
          aria-expanded={!collapsed}
          aria-controls={`multiselect-list-${fieldId}`}
          onClick={() => setCollapsed((v) => !v)}
        >
          <span className="material-symbols-outlined" aria-hidden>
            {collapsed ? "expand_more" : "expand_less"}
          </span>
          <span aria-live="polite">
            {checkedCount}개 선택
            <span className={style.multiSelectHeaderTotal}>
              {" "}
              / 전체 {options.length}개
            </span>
          </span>
        </button>
        <div
          className={style.multiSelectChipRow}
          role="group"
          aria-label="선택 상태 필터"
        >
          {CHECK_FILTERS.map((chip) => {
            const active = checkFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                className={`${style.multiSelectChip}${
                  active ? ` ${style.multiSelectChipActive}` : ""
                }`}
                aria-pressed={active}
                onClick={() => setCheckFilter(chip.id)}
              >
                {chip.label}
                <span className={style.multiSelectChipCount}>
                  {filterCounts[chip.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!collapsed && (
        <div id={`multiselect-list-${fieldId}`}>
          <input
            className={style.multiSelectSearch}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="항목 검색"
            aria-label="체크박스 항목 검색"
            autoComplete="off"
          />
          <div className={style.multiSelectToolbar}>
            <label className={style.multiSelectSelectAll}>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={() =>
                  !disabled &&
                  onChange(toggleSelectAllVisible(selected, visibleOptions))
                }
                disabled={disabled || visibleOptions.length === 0}
                aria-label={
                  narrowed
                    ? `보이는 항목 전체 선택 (${visibleOptions.length})`
                    : `전체 선택 (${options.length})`
                }
              />
              <span>
                {narrowed
                  ? `보이는 항목 전체 선택 (${visibleOptions.length})`
                  : `전체 선택 (${options.length})`}
              </span>
            </label>
          </div>
          {filteredIndices.length === 0 ? (
            <div className={style.multiSelectEmpty}>
              {emptyListMessage(options.length, checkFilter)}
            </div>
          ) : (
            filteredIndices.map((i) => {
              const opt = options[i];
              return (
                <label key={`${fieldId}-${i}`} className={style.choiceOption}>
                  <input
                    type="checkbox"
                    checked={selectedSet.has(opt)}
                    onChange={(e) => {
                      if (disabled) return;
                      if (e.target.checked) {
                        if (selectedSet.has(opt)) return;
                        onChange([...selected, opt]);
                      } else {
                        onChange(selected.filter((s) => s !== opt));
                      }
                    }}
                    disabled={disabled}
                  />
                  {opt}
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectField;
