import { ReactNode } from "react";
import Svg from "assets/svg/Svg";
import { DateRange } from "components/dateRangeFilter/DateRangeFilterDropdown";
import MergeStyleFilterBar, {
  type MergeFilterField,
} from "components/mergeFilter/MergeStyleFilterBar";
import bStyle from "../boards.module.scss";
import style from "./altBoard.module.scss";
import {
  hasSheetFieldFilters,
  RESPONDENT_FILTER_KEY,
} from "./sheetRowFilter";

export type TSheetColumnChip = {
  fieldId: string;
  label: string;
};

const COLUMN_TONE_CLASSES = [
  bStyle.filterChipToneOptional,
  bStyle.filterChipToneScheduled,
  bStyle.filterChipToneDraft,
  bStyle.filterChipToneSubmitted,
  bStyle.filterChipToneApproval,
  bStyle.filterChipToneClosed,
  bStyle.filterChipTonePending,
  bStyle.filterChipToneDirect,
] as const;

const toneClassForColumn = (fieldId: string, index: number): string => {
  if (fieldId === "_formTitle") return bStyle.filterChipToneApproval;
  if (fieldId === "_respondent") return bStyle.filterChipToneSubmitted;
  if (fieldId === "_submittedAt") return bStyle.filterChipToneClosed;
  return COLUMN_TONE_CLASSES[index % COLUMN_TONE_CLASSES.length];
};

type Props = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  keywordPlaceholder?: string;
  filterFields: MergeFilterField[];
  textFilters: Record<string, string>;
  onTextFilterChange: (key: string, value: string) => void;
  dateFilters: Record<string, DateRange>;
  onDateFilterChange: (key: string, range: DateRange) => void;
  onClearKeywordAndFieldFilters: () => void;
  columns: TSheetColumnChip[];
  /** 숨긴 필드 id 집합 — 칩이 꺼진 상태 */
  hiddenColumns: Set<string>;
  onToggleColumn: (fieldId: string) => void;
  onShowAllColumns: () => void;
  onClearSearchAndSort: () => void;
  hasSearchOrSort: boolean;
  sortSlot?: ReactNode;
};

const ChipIcon = ({ type }: { type: string }) => (
  <span className={bStyle.filterChipIcon} aria-hidden>
    <Svg type={type} width="12px" height="12px" />
  </span>
);

/**
 * 검색 + 항목별 세부 필터 + 항목 표시 칩 + 정렬
 * 칩은 행 필터가 아니라 컬럼(항목) 표시 여부를 토글한다.
 */
const SheetDetailFilterBar = ({
  keyword,
  onKeywordChange,
  keywordPlaceholder = "키워드 검색",
  filterFields,
  textFilters,
  onTextFilterChange,
  dateFilters,
  onDateFilterChange,
  onClearKeywordAndFieldFilters,
  columns,
  hiddenColumns,
  onToggleColumn,
  onShowAllColumns,
  onClearSearchAndSort,
  hasSearchOrSort,
  sortSlot,
}: Props) => {
  const hasHidden = hiddenColumns.size > 0;
  const allVisible = !hasHidden;
  const hasFieldFilters = hasSheetFieldFilters(textFilters, dateFilters);

  return (
    <div className={bStyle.activityFilterBlock}>
      <MergeStyleFilterBar
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        keywordPlaceholder={keywordPlaceholder}
        textFilters={textFilters}
        onTextFilterChange={onTextFilterChange}
        dateFilters={dateFilters}
        onDateFilterChange={onDateFilterChange}
        fields={filterFields}
        respondentFilterKey={RESPONDENT_FILTER_KEY}
        showRespondentFilter
        onClear={onClearKeywordAndFieldFilters}
      />

      <div className={style.sheetFilterChipRow}>
        <div
          className={bStyle.filterChipRow}
          role="group"
          aria-label="표시 항목"
        >
          <button
            type="button"
            className={`${bStyle.filterChip} ${bStyle.filterChipToneAll} ${
              allVisible ? bStyle.filterChipActive : ""
            }`}
            aria-pressed={allVisible}
            title="모든 항목 표시"
            onClick={onShowAllColumns}
          >
            <ChipIcon type="list" />
            전체
          </button>
          {columns.map((col, index) => {
            const visible = !hiddenColumns.has(col.fieldId);
            return (
              <button
                key={col.fieldId}
                type="button"
                className={`${bStyle.filterChip} ${toneClassForColumn(
                  col.fieldId,
                  index
                )} ${
                  visible ? bStyle.filterChipActive : style.sheetColumnChipOff
                }`}
                aria-pressed={visible}
                title={visible ? `${col.label} 숨기기` : `${col.label} 표시`}
                onClick={() => onToggleColumn(col.fieldId)}
              >
                <ChipIcon type="list" />
                {col.label}
              </button>
            );
          })}
          {(hasSearchOrSort || hasHidden || hasFieldFilters) && (
            <button
              type="button"
              className={bStyle.filterChipReset}
              onClick={() => {
                onShowAllColumns();
                onClearSearchAndSort();
              }}
            >
              초기화
            </button>
          )}
        </div>
        {sortSlot}
      </div>
    </div>
  );
};

export default SheetDetailFilterBar;
