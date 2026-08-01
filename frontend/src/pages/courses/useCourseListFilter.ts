/**
 * 수업 목록 공통 검색·컬럼 필터 (수강신청 / 수강현황 / 개설 / 담당 / 전체 목록)
 */

import { useEffect, useMemo, useState } from "react";
import { defaultHeaderList } from "./table/defaultHeaderList";
import { TEnrollColumnOption } from "./EnrollFilterBar";

export function buildCourseColumnOptions(
  subjectLabels: string[]
): TEnrollColumnOption[] {
  return [
    ...subjectLabels.map((label) => ({ key: label, text: label })),
    { key: "classTitle", text: "수업명" },
    ...defaultHeaderList
      .filter((h) => !!h.key)
      .map((h) => ({ key: h.key as string, text: h.text })),
  ];
}

export function matchesCourseKeyword(course: any, q: string): boolean {
  if (!q) return true;
  const haystack = [
    course.classTitle,
    course.classroom,
    course.userName,
    ...(Array.isArray(course.subject) ? course.subject : []),
    ...(Array.isArray(course.teachers)
      ? course.teachers.map((t: any) => t.userName)
      : []),
    ...(Array.isArray(course.time)
      ? course.time.map((t: any) => t.label)
      : []),
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

function loadOnlyAvailable(storageKey: string): boolean {
  try {
    return localStorage.getItem(`${storageKey}.onlyAvailable`) === "1";
  } catch {
    return false;
  }
}

function persistOnlyAvailable(storageKey: string, value: boolean) {
  try {
    localStorage.setItem(`${storageKey}.onlyAvailable`, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

type Options = {
  /** localStorage 접두사 (예: enroll, courses.enrolled) */
  storageKey: string;
  subjectLabels: string[];
  enableOnlyAvailable?: boolean;
};

export function useCourseListFilter(options: Options) {
  const { storageKey, subjectLabels, enableOnlyAvailable = false } = options;

  const columnOptions = useMemo(
    () => buildCourseColumnOptions(subjectLabels),
    [subjectLabels.join("|")]
  );
  const allColumnKeys = useMemo(
    () => columnOptions.map((c) => c.key),
    [columnOptions]
  );

  const [keyword, setKeyword] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set()
  );
  const [onlyAvailable, setOnlyAvailable] = useState(() =>
    enableOnlyAvailable ? loadOnlyAvailable(storageKey) : false
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
    if (enableOnlyAvailable) {
      setOnlyAvailable(false);
      persistOnlyAvailable(storageKey, false);
    }
  };

  const handleOnlyAvailableChange = (value: boolean) => {
    if (!enableOnlyAvailable) return;
    setOnlyAvailable(value);
    persistOnlyAvailable(storageKey, value);
  };

  const handleFilterReset = () => {
    setKeyword("");
    handleShowAll();
  };

  const filterCourses = <T,>(
    courses: T[],
    isAvailable?: (course: T) => boolean
  ): T[] => {
    const q = keyword.trim().toLowerCase();
    return courses.filter((course) => {
      if (
        enableOnlyAvailable &&
        onlyAvailable &&
        isAvailable &&
        !isAvailable(course)
      ) {
        return false;
      }
      return matchesCourseKeyword(course, q);
    });
  };

  return {
    keyword,
    setKeyword,
    columnOptions,
    effectiveVisibleColumns,
    handleColumnToggle,
    handleShowAll,
    handleFilterReset,
    onlyAvailable,
    handleOnlyAvailableChange,
    enableOnlyAvailable,
    filterCourses,
  };
}
