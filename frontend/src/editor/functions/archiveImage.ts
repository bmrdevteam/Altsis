export type TArchiveFileValue = {
  key: string;
  originalName: string;
};

export type TArchiveImageLocation = {
  schoolId: string;
  label: string;
  fieldLabel: string;
};

export const isArchiveFileValue = (value: unknown): value is TArchiveFileValue =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  typeof (value as TArchiveFileValue).key === "string" &&
  typeof (value as TArchiveFileValue).originalName === "string" &&
  !!(value as TArchiveFileValue).key;

/** `{schoolId}//archive//{label}//{fieldLabel}` */
export const parseArchiveImageLocation = (
  location: string | undefined
): TArchiveImageLocation | null => {
  if (!location) return null;
  const parts = String(location).split("//");
  if (parts.length < 4 || parts[1] !== "archive") return null;
  const schoolId = parts[0];
  const label = parts[2];
  const fieldLabel = parts[3];
  if (!schoolId || !label || !fieldLabel) return null;
  return { schoolId, label, fieldLabel };
};

export const getArchiveIdFromDbData = (
  dbData: unknown,
  schoolId: string
): string | undefined => {
  if (!dbData || typeof dbData !== "object" || !schoolId) return undefined;
  const id = (dbData as Record<string, { archiveId?: unknown }>)[schoolId]
    ?.archiveId;
  return typeof id === "string" && id ? id : undefined;
};
