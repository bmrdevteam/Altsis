/**
 * Whether archive.data[label] holds a file whose S3 key matches.
 * Object archives: data[label][fieldLabel].key
 * Array archives: some row[fieldLabel].key
 *
 * @param {object|null|undefined} data
 * @param {string} label
 * @param {string} fieldLabel
 * @param {string} key
 * @returns {boolean}
 */
export const archiveSectionHasFileKey = (data, label, fieldLabel, key) => {
  if (!data || typeof data !== "object" || !label || !fieldLabel || !key) {
    return false;
  }
  const section = data[label];
  if (section == null) return false;

  const fieldHasKey = (field) =>
    !!field &&
    typeof field === "object" &&
    !Array.isArray(field) &&
    field.key === key;

  if (Array.isArray(section)) {
    return section.some((row) => fieldHasKey(row?.[fieldLabel]));
  }
  if (typeof section === "object") {
    return fieldHasKey(section[fieldLabel]);
  }
  return false;
};
