import { useMemo, useState } from "react";
import style from "./altBoard.module.scss";
import {
  filterOptionIndices,
  isAllVisibleSelected,
  toggleSelectAllVisible,
} from "./multiSelectOptions";

type Props = {
  fieldId: string;
  options: string[];
  selected: string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
};

const MultiSelectField = ({
  fieldId,
  options,
  selected,
  disabled = false,
  onChange,
}: Props) => {
  const [query, setQuery] = useState("");
  const filteredIndices = useMemo(
    () => filterOptionIndices(options, query),
    [options, query]
  );
  const visibleOptions = filteredIndices.map((i) => options[i]);
  const allVisibleSelected = isAllVisibleSelected(selected, visibleOptions);
  const hasQuery = query.trim().length > 0;

  return (
    <div className={style.multiSelectField}>
      <input
        className={style.multiSelectSearch}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="항목 검색"
        aria-label="복수 선택 항목 검색"
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
              hasQuery
                ? `검색 결과 전체 선택 (${visibleOptions.length})`
                : `전체 선택 (${options.length})`
            }
          />
          <span>
            {hasQuery
              ? `검색 결과 전체 선택 (${visibleOptions.length})`
              : `전체 선택 (${options.length})`}
          </span>
        </label>
        <span className={style.multiSelectCount} aria-live="polite">
          {selected.length}개 선택
        </span>
      </div>
      {filteredIndices.length === 0 ? (
        <div className={style.multiSelectEmpty}>
          {options.length === 0
            ? "선택지가 없습니다."
            : "검색 결과가 없습니다."}
        </div>
      ) : (
        filteredIndices.map((i) => {
          const opt = options[i];
          return (
            <label key={`${fieldId}-${i}`} className={style.choiceOption}>
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) => {
                  if (disabled) return;
                  if (e.target.checked) {
                    if (selected.includes(opt)) return;
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
  );
};

export default MultiSelectField;
