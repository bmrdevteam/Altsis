import { FilterConfig } from "../types";
import { TSchool } from "types/schools";

export type FilterOperator = FilterConfig["operator"];

export const FILTER_OPERATOR_OPTIONS: {
  value: FilterOperator;
  label: string;
  needsValue: boolean;
}[] = [
  { value: "===", label: "같음", needsValue: true },
  { value: "!==", label: "다름", needsValue: true },
  { value: "empty", label: "비어 있음", needsValue: false },
  { value: "notEmpty", label: "비어 있지 않음", needsValue: false },
];

export function operatorNeedsValue(operator: string | undefined): boolean {
  return operator !== "empty" && operator !== "notEmpty";
}

/** Normalize filter/item values; keep 0 as "0", other falsy as "". */
export function normalizeFilterValue(value: any): string {
  if (value === 0) return "0";
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

/**
 * Whether a data row matches one filter rule.
 * AND: keep row only if every filter matches.
 * OR: keep row if any filter matches.
 */
export function matchesDataFilter(
  item: Record<string, any> | null | undefined,
  filter: { by?: string; operator?: string; value?: any }
): boolean {
  if (!filter?.by) return true;

  const raw = item?.[filter.by];
  const normalized = normalizeFilterValue(raw);
  const filterVal = normalizeFilterValue(filter.value);
  const op = filter.operator || "===";

  if (op === "empty") {
    return normalized === "";
  }
  if (op === "notEmpty") {
    return normalized !== "";
  }
  if (op === "===") {
    return normalized === filterVal;
  }
  if (op === "!==") {
    return normalized !== filterVal;
  }
  return true;
}

/** Field labels available for the selected table-repeat data source. */
export function getFilterFieldOptions(
  repeatBy: string,
  schools: TSchool[],
  archiveData: Record<string, any[]> | undefined,
  evaluationData: Record<string, any> | undefined
): string[] {
  if (!repeatBy) return [];

  const parts = repeatBy.split("//");
  const schoolId = parts[0];
  const kind = parts[1];
  const school = schools.find((s) => s.schoolId === schoolId);
  if (!school) return [];

  if (kind === "archive") {
    const archiveLabel = parts[2];
    if (!archiveLabel) return [];
    const archive = archiveData?.[school._id]?.find(
      (a: any) => a.label === archiveLabel
    );
    const labels = (archive?.fields ?? [])
      .map((f: any) => f.label)
      .filter(Boolean);
    // Include runningTotal / total variants that appear in the data tree
    const extras: string[] = [];
    for (const f of archive?.fields ?? []) {
      if (f.runningTotal) extras.push(`${f.label}[누계합산]`);
      if (f.total) extras.push(`${f.label}[합산]`);
    }
    return Array.from(new Set([...labels, ...extras]));
  }

  if (kind === "evaluation") {
    const ev = evaluationData?.[school._id];
    const fields = new Set<string>(["학년도", "학년"]);
    ev?.subjectLabels?.forEach((label: string) => fields.add(label));
    ev?.evaluationFieldsByYear?.forEach((f: { label: string }) => {
      fields.add(`연도별/${f.label}`);
    });
    (ev?.terms ?? []).forEach((term: string) => {
      fields.add(`${term}/단위수`);
      fields.add(`${term}/단위수[합산]`);
      (ev?.evaluationFieldsByTerm?.[term] ?? []).forEach(
        (f: { label: string }) => {
          fields.add(`${term}/${f.label}`);
        }
      );
    });
    return Array.from(fields);
  }

  return [];
}

/** Ensure legacy/custom field values still appear in the select. */
export function withCurrentFieldOption(
  options: string[],
  current: string | undefined
): string[] {
  if (!current) return options;
  if (options.includes(current)) return options;
  return [current, ...options];
}
