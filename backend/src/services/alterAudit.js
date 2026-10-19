/**
 * Alter audit log. Collection, school-year purge, and the view API.
 * There is no export.
 */

import cron from "node-cron";
import { AlterError } from "../alter/core/errors.js";
import {
  AUDIT_VIEW,
  auditIsExpired,
  projectAudit,
  summarizeAudits,
  toAuditRecord,
} from "../alter/core/auditRetention.js";
import { Academy } from "../models/Academy.js";
import { AlterAuditLog } from "../models/AlterAuditLog.js";

const roleOf = (user) => {
  const auth = String(user?.auth || "");
  if (auth === "owner" || auth === "admin" || auth === "manager") return auth;
  return "member";
};

const inRange = (row, from, to, now) => {
  if (auditIsExpired(row, now)) return false;
  const at = new Date(row.createdAt).getTime();
  if (Number.isNaN(at)) return false;
  if (from && at < new Date(from).getTime()) return false;
  if (to && at > new Date(to).getTime()) return false;
  return true;
};

const connReady = (academyId) => {
  try {
    return Boolean(AlterAuditLog(academyId));
  } catch {
    return false;
  }
};

const mongoStore = {
  async insert(academyId, record) {
    if (!academyId || !connReady(academyId)) return record;
    await AlterAuditLog(academyId).create(record);
    return record;
  },
  async list(academyId) {
    if (!academyId || !connReady(academyId)) return [];
    return AlterAuditLog(academyId).find({}).sort({ createdAt: -1 }).limit(200).lean();
  },
  async purge(academyId, now) {
    if (!academyId || !connReady(academyId)) return 0;
    const result = await AlterAuditLog(academyId).deleteMany({ expiresAt: { $lte: now } });
    return result.deletedCount || 0;
  },
  async academyIds() {
    if (typeof Academy?.find !== "function") return [];
    const rows = await Academy.find({}).select("academyId").lean();
    return rows.map((row) => row.academyId).filter((id) => id && id !== "root");
  },
};

let store = mongoStore;
let lastPurged = 0;
let purgeStarted = false;

export const setAuditStore = (next) => {
  store = next || mongoStore;
};

export const resetAuditStore = () => {
  store = mongoStore;
  lastPurged = 0;
};

export const recordAlterAudit = async (input = {}) => {
  const record = toAuditRecord(input);
  if (!record.academyId || !record.expiresAt) return record;
  await store.insert(record.academyId, record);
  return record;
};

export const purgeExpiredAudits = async (academyId, now = new Date()) => store.purge(academyId, now);

export const purgeAllExpiredAudits = async (now = new Date()) => {
  const ids = await store.academyIds();
  let purged = 0;
  for (const id of ids) purged += await store.purge(id, now);
  lastPurged = purged;
  return purged;
};

/** Daily purge. Tests do not start it. */
export const startAuditPurge = () => {
  if (purgeStarted || String(process.env.NODE_ENV || "").trim() === "test") return;
  purgeStarted = true;
  cron.schedule("15 3 * * *", () => {
    purgeAllExpiredAudits().catch(() => {});
  });
};

/**
 * owner: every academy and every field.
 * admin: own academy, summary fields.
 * manager and below: forbidden.
 * The view itself is stored and is not part of this response.
 */
export const viewAlterAudits = async ({
  user,
  academyId,
  queryAcademyId,
  from,
  to,
} = {}) => {
  const role = roleOf(user);
  const view = AUDIT_VIEW[role] || AUDIT_VIEW.manager;
  if (view.scope === "none") {
    throw new AlterError("FORBIDDEN", 403, "감사 로그를 볼 권한이 없습니다.");
  }
  const own = String(academyId || "");
  if (view.scope === "own-academy" && !own) {
    throw new AlterError("INVALID_INPUT", 400, "학원이 필요합니다.");
  }
  const requested = String(queryAcademyId || "").trim();
  const academies =
    view.scope === "own-academy"
      ? [own]
      : requested
        ? [requested]
        : await store.academyIds();
  const now = new Date();
  const raw = [];
  for (const id of academies) {
    const rows = await store.list(id);
    for (const row of rows) {
      if (inRange(row, from, to, now)) raw.push(row);
    }
  }
  await recordAlterAudit({
    academyId: own || academies[0] || requested,
    userId: String(user?._id || ""),
    role,
    decision: "view",
    reasonCode: "AUDIT_VIEW",
    kind: "audit",
    viewAcademyId: view.scope === "own-academy" ? own : requested || "*",
    viewFrom: from || "",
    viewTo: to || "",
  });
  const metrics = summarizeAudits(raw, { includeCost: role === "owner" });
  metrics.purged = lastPurged;
  return {
    records: raw.map((row) => projectAudit(row, role)).filter(Boolean),
    metrics,
  };
};
