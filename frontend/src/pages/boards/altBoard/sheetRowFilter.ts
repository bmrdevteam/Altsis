import { DateRange } from "components/dateRangeFilter/DateRangeFilterDropdown";
import { TAltSheetRow } from "types/altSheet";

export const RESPONDENT_FILTER_KEY = "_respondentName";
export const SUBMITTED_AT_FILTER_KEY = "_submittedAt";

export type TSheetFilterField = {
  _id: string;
  type?: string;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export const hasSheetFieldFilters = (
  textFilters: Record<string, string>,
  dateFilters: Record<string, DateRange>
): boolean =>
  Object.values(textFilters).some((v) => !!v.trim()) ||
  Object.values(dateFilters).some((r) => !!(r.from || r.to));

const toLocalYmd = (value: string): string | null => {
  if (!value) return null;
  if (YMD.test(value)) return value;
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const prefix = value.slice(0, 10);
  return YMD.test(prefix) ? prefix : null;
};

const ymdInRange = (ymd: string, range: DateRange): boolean => {
  if (range.from && ymd < range.from) return false;
  if (range.to && ymd > range.to) return false;
  return true;
};

const cellYmdList = (
  value: unknown,
  fieldType?: string,
  isSubmittedAt = false
): string[] => {
  if (value == null || value === "") return [];
  if (isSubmittedAt && typeof value === "string") {
    const ymd = toLocalYmd(value);
    return ymd ? [ymd] : [];
  }
  if (fieldType === "multiDate" && Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" && YMD.test(v) ? v : null))
      .filter((v): v is string => !!v);
  }
  if (typeof value === "string") {
    if (YMD.test(value)) return [value];
    const ymd = toLocalYmd(value);
    return ymd ? [ymd] : [];
  }
  return [];
};

type TCellFormatter<F extends TSheetFilterField> = (
  value: any,
  field?: F
) => string;

const rowMatchesTextFilter = <F extends TSheetFilterField>(
  row: TAltSheetRow,
  key: string,
  rawQuery: string,
  fields: F[],
  formatCellValue: TCellFormatter<F>
): boolean => {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  if (key === RESPONDENT_FILTER_KEY) {
    return (
      (row._respondentName || "").toLowerCase().includes(q) ||
      (row._respondentId || "").toLowerCase().includes(q)
    );
  }
  const field = fields.find((f) => f._id === key);
  return formatCellValue(row.data?.[key], field).toLowerCase().includes(q);
};

const rowMatchesDateFilter = <F extends TSheetFilterField>(
  row: TAltSheetRow,
  key: string,
  range: DateRange,
  fields: F[]
): boolean => {
  if (!range.from && !range.to) return true;
  if (key === SUBMITTED_AT_FILTER_KEY) {
    const dates = cellYmdList(row._submittedAt, "date", true);
    return dates.some((ymd) => ymdInRange(ymd, range));
  }
  const field = fields.find((f) => f._id === key);
  const dates = cellYmdList(row.data?.[key], field?.type);
  return dates.some((ymd) => ymdInRange(ymd, range));
};

/** 항목별 텍스트·날짜 필터를 AND로 적용 */
export const rowMatchesFieldFilters = <F extends TSheetFilterField>(
  row: TAltSheetRow,
  textFilters: Record<string, string>,
  dateFilters: Record<string, DateRange>,
  fields: F[],
  formatCellValue: TCellFormatter<F>
): boolean => {
  for (const [key, value] of Object.entries(textFilters)) {
    if (!rowMatchesTextFilter(row, key, value, fields, formatCellValue)) {
      return false;
    }
  }
  for (const [key, range] of Object.entries(dateFilters)) {
    if (!rowMatchesDateFilter(row, key, range, fields)) {
      return false;
    }
  }
  return true;
};
