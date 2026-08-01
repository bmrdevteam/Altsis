/**
 * Pure helpers for Goals archive label counts
 */

import { isEmptyValue } from "./isEmptyValue.js";

/**
 * Count for one archive label.
 * array → length; object/other → 입력 여부 0/1
 */
export const archiveLabelCount = (archiveData, label, dataType) => {
  if (!label || !archiveData || typeof archiveData !== "object") return 0;
  const value = archiveData[label];
  if (dataType === "array" || Array.isArray(value)) {
    return Array.isArray(value) ? value.length : 0;
  }
  return isEmptyValue(value) ? 0 : 1;
};

/**
 * formArchive labels the user may view for their own record.
 */
export const ownArchiveLabels = (formArchive = []) =>
  (formArchive || []).filter(
    (item) => item?.authStudent && item.authStudent !== "undefined"
  );
