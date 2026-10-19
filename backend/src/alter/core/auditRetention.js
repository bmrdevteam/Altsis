/**
 * Audit-log shape for Q7. Retention math only — no collection and no TTL job.
 * A record lives until the school year after its own school year ends.
 * Example: a 2026 school-year record expires at the end of school year 2027.
 * The default year starts on 1 March when an academy has no year boundary.
 */

export const DEFAULT_SCHOOL_YEAR_START = Object.freeze({ month: 3, day: 1 });

export const AUDIT_LOG_FIELDS = Object.freeze([
  "createdAt",
  "expiresAt",
  "academyId",
  "userId",
  "role",
  "skillId",
  "kind",
  "decision",
  "reasonCode",
  "conversationId",
  "confirmationId",
  "costEstimate",
  "maskedQuery",
]);

export const AUDIT_OMITTED = Object.freeze([
  "prompt",
  "modelResponse",
  "studentPii",
]);

/** owner sees every academy and every field. admin sees one academy, summary only. */
export const AUDIT_VIEW = Object.freeze({
  owner: Object.freeze({ scope: "all-academies", fields: "full" }),
  admin: Object.freeze({
    scope: "own-academy",
    fields: Object.freeze(["createdAt", "userId", "role", "skillId", "decision", "reasonCode", "maskedQuery"]),
  }),
  manager: Object.freeze({ scope: "none", fields: Object.freeze([]) }),
});

const asDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

/** School year label for an instant. March is the default start. */
export const schoolYearOf = (value, start = DEFAULT_SCHOOL_YEAR_START) => {
  const date = asDate(value);
  if (!date) return null;
  const month = start?.month || DEFAULT_SCHOOL_YEAR_START.month;
  const year = date.getUTCFullYear();
  const current = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const startDay = start?.day || 1;
  if (current > month || (current === month && day >= startDay)) return year;
  return year - 1;
};

/** Last UTC millisecond of February in the calendar year after `schoolYear`. */
export const schoolYearEndsAt = (schoolYear) => {
  const year = Number(schoolYear);
  if (!Number.isInteger(year)) return null;
  return new Date(Date.UTC(year + 1, 2, 0, 23, 59, 59, 999));
};

/** End of the following school year. */
export const auditExpiresAt = (createdAt, start = DEFAULT_SCHOOL_YEAR_START) => {
  const schoolYear = schoolYearOf(createdAt, start);
  if (schoolYear == null) return null;
  return schoolYearEndsAt(schoolYear + 1);
};
