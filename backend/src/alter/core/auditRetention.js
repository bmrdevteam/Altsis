/**
 * Audit-log shape for Q7.
 * A record lives until the school year after its own school year ends.
 * Example: a 2026 school-year record expires at the end of school year 2027.
 * The default year starts on 1 March when an academy has no year boundary.
 */

import { maskSensitiveText } from "./safety.js";

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
  "viewAcademyId",
  "viewFrom",
  "viewTo",
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

export const auditIsExpired = (record, now = new Date()) => {
  const expires = asDate(record?.expiresAt);
  const at = asDate(now);
  if (!expires || !at) return false;
  return expires.getTime() <= at.getTime();
};

const textOf = (value, max = 160) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);

/** Stored row. Prompt, model text, and student fields are dropped. */
export const toAuditRecord = (input = {}, now = new Date()) => {
  const createdAt = asDate(input.createdAt) || now;
  const record = {
    createdAt,
    expiresAt: auditExpiresAt(createdAt),
    academyId: textOf(input.academyId, 80),
    userId: textOf(input.userId, 80),
    role: textOf(input.role, 32),
    skillId: textOf(input.skillId, 80),
    kind: textOf(input.kind, 32),
    decision: textOf(input.decision, 32),
    reasonCode: textOf(input.reasonCode, 64),
    conversationId: textOf(input.conversationId, 80),
    confirmationId: textOf(input.confirmationId, 80),
    maskedQuery: maskSensitiveText(textOf(input.query || input.maskedQuery, 300)).text.slice(0, 160),
    viewAcademyId: textOf(input.viewAcademyId, 80),
    viewFrom: textOf(input.viewFrom, 40),
    viewTo: textOf(input.viewTo, 40),
  };
  if (Number.isFinite(Number(input.costEstimate))) {
    record.costEstimate = Number(input.costEstimate);
  }
  return record;
};

/** owner: every field. admin: summary. manager and below: nothing. */
export const projectAudit = (record, role) => {
  const view = AUDIT_VIEW[role] || AUDIT_VIEW.manager;
  if (!view || view.scope === "none") return null;
  const fields = view.fields === "full" ? AUDIT_LOG_FIELDS : view.fields;
  const projected = {};
  for (const field of fields) {
    const value = record?.[field];
    if (value == null || value === "") continue;
    projected[field] = value;
  }
  return projected;
};

/** Skill calls and denials. A log view is not a skill call. */
export const summarizeAudits = (records, { includeCost = false } = {}) => {
  const rows = (records || []).filter((row) => row && row.decision !== "view");
  const calls = rows.length;
  const denies = rows.filter((row) => row.decision === "deny").length;
  const bySkill = {};
  for (const row of rows) {
    const id = row.skillId || "unknown";
    if (!bySkill[id]) bySkill[id] = { calls: 0, denies: 0, denyRate: 0 };
    bySkill[id].calls += 1;
    if (row.decision === "deny") bySkill[id].denies += 1;
  }
  for (const bucket of Object.values(bySkill)) {
    bucket.denyRate = bucket.calls ? bucket.denies / bucket.calls : 0;
  }
  const metrics = {
    calls,
    denies,
    denyRate: calls ? denies / calls : 0,
    bySkill,
  };
  if (includeCost) {
    metrics.costEstimate = rows.reduce((sum, row) => sum + (Number(row.costEstimate) || 0), 0);
  }
  return metrics;
};
