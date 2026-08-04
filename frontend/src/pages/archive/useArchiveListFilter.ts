/**
 * 기록(아카이브) 목록 공통 검색·컬럼 필터 — 유형(formArchive.fields)별
 */

import { useEffect, useMemo, useState } from "react";
import { TEnrollColumnOption } from "pages/courses/EnrollFilterBar";
import { TSchoolFormArchiveField } from "types/schools";

export const ARCHIVE_NAME_COLUMN_KEY = "userName";

export function buildArchiveColumnOptions(
  fields: TSchoolFormArchiveField[] | undefined
): TEnrollColumnOption[] {
  return [
    { key: ARCHIVE_NAME_COLUMN_KEY, text: "이름" },
    ...(fields ?? []).map((f) => ({ key: f.label, text: f.label })),
  ];
}

function fieldValueToSearchText(value: any): string {
  if (value == null || value === "") return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object") {
    return [value.originalName, value.fileName, value.key]
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

export function matchesArchiveKeyword(
  row: any,
  q: string,
  fieldLabels: string[]
): boolean {
  if (!q) return true;
  const haystack = [
    row.userName,
    row.grade,
    row.userId,
    ...fieldLabels.map((label) => fieldValueToSearchText(row[label])),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function loadVisibleColumns(
  storageKey: string,
  allKeys: string[]
): Set<string> {
  try {
    const raw = localStorage.getItem(`${storageKey}.visibleColumns`);
    if (!raw) return new Set(allKeys);
    const saved = JSON.parse(raw) as string[];
    const next = new Set(saved.filter((k) => allKeys.includes(k)));
    return next.size > 0 ? next : new Set(allKeys);
  } catch {
    return new Set(allKeys);
  }
}

function persistVisibleColumns(storageKey: string, keys: Set<string>) {
  try {
    localStorage.setItem(
      `${storageKey}.visibleColumns`,
      JSON.stringify(Array.from(keys))
    );
  } catch {
    /* ignore */
  }
}

type Options = {
  /** localStorage 접두사 (예: archive.등록) */
  storageKey: string;
  fields: TSchoolFormArchiveField[] | undefined;
};

export function useArchiveListFilter(options: Options) {
  const { storageKey, fields } = options;

  const fieldLabels = useMemo(
    () => (fields ?? []).map((f) => f.label),
    [(fields ?? []).map((f) => f.label).join("|")]
  );

  const columnOptions = useMemo(
    () => buildArchiveColumnOptions(fields),
    [fieldLabels.join("|")]
  );

  const allColumnKeys = useMemo(
    () => columnOptions.map((c) => c.key),
    [columnOptions]
  );

  const [keyword, setKeyword] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    if (allColumnKeys.length === 0) return;
    setVisibleColumns(loadVisibleColumns(storageKey, allColumnKeys));
  }, [storageKey, allColumnKeys.join("|")]);

  const effectiveVisibleColumns = useMemo(() => {
    if (allColumnKeys.length === 0) return new Set<string>();
    if (visibleColumns.size === 0) return new Set(allColumnKeys);
    const next = new Set(
      Array.from(visibleColumns).filter((k) => allColumnKeys.includes(k))
    );
    return next.size > 0 ? next : new Set(allColumnKeys);
  }, [visibleColumns, allColumnKeys]);

  const handleColumnToggle = (key: string) => {
    setVisibleColumns((prev) => {
      const base = prev.size === 0 ? new Set(allColumnKeys) : new Set(prev);
      if (base.has(key)) base.delete(key);
      else base.add(key);
      const final = base.size === 0 ? new Set(allColumnKeys) : base;
      persistVisibleColumns(storageKey, final);
      return final;
    });
  };

  const handleShowAll = () => {
    const all = new Set(allColumnKeys);
    setVisibleColumns(all);
    persistVisibleColumns(storageKey, all);
  };

  const handleFilterReset = () => {
    setKeyword("");
    handleShowAll();
  };

  const filterRows = <T,>(rows: T[]): T[] => {
    const q = keyword.trim().toLowerCase();
    return rows.filter((row) => matchesArchiveKeyword(row, q, fieldLabels));
  };

  return {
    keyword,
    setKeyword,
    fieldLabels,
    columnOptions,
    effectiveVisibleColumns,
    handleColumnToggle,
    handleShowAll,
    handleFilterReset,
    filterRows,
  };
}
