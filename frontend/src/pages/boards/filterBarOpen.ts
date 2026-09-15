import { useState } from "react";

export const FILTER_BAR_OPEN_PREFIX = "filterBarOpen";

export const FILTER_BAR_OPEN_KEYS = {
  boards: "boards",
  activity: "activity",
  docs: "docs",
  records: "records",
  sheet: "sheet",
  evaluation: "evaluation",
  library: "library",
} as const;

export type TFilterBarOpenKey =
  (typeof FILTER_BAR_OPEN_KEYS)[keyof typeof FILTER_BAR_OPEN_KEYS];

export const filterBarOpenStorageKey = (key: TFilterBarOpenKey): string =>
  `${FILTER_BAR_OPEN_PREFIX}:${key}`;

export const readFilterBarOpen = (
  key: TFilterBarOpenKey,
  fallback = true
): boolean => {
  try {
    const stored = localStorage.getItem(filterBarOpenStorageKey(key));
    if (stored === "0") return false;
    if (stored === "1") return true;
    return fallback;
  } catch {
    return fallback;
  }
};

export const writeFilterBarOpen = (
  key: TFilterBarOpenKey,
  open: boolean
): void => {
  try {
    localStorage.setItem(filterBarOpenStorageKey(key), open ? "1" : "0");
  } catch {
    // private mode / quota
  }
};

export const useFilterBarOpen = (key: TFilterBarOpenKey, fallback = true) => {
  const [open, setOpen] = useState(() => readFilterBarOpen(key, fallback));

  const onToggle = () => {
    setOpen((value) => {
      const next = !value;
      writeFilterBarOpen(key, next);
      return next;
    });
  };

  return { open, onToggle };
};
