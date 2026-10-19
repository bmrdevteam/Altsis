import { auditIsExpired } from "../../src/alter/core/auditRetention.js";
import {
  purgeAllExpiredAudits,
  recordAlterAudit,
  resetAuditStore,
  setAuditStore,
  viewAlterAudits,
} from "../../src/services/alterAudit.js";

const memoryStore = () => {
  const rows = [];
  return {
    rows,
    async insert(academyId, record) {
      rows.push({ ...record, academyId });
      return record;
    },
    async list(academyId) {
      return rows.filter((row) => row.academyId === academyId);
    },
    async purge(academyId, now) {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        if (rows[i].academyId === academyId && auditIsExpired(rows[i], now)) rows.splice(i, 1);
      }
      return before - rows.length;
    },
    async academyIds() {
      return ["academy-a", "academy-b"];
    },
  };
};

describe("alter audit view", () => {
  let store;

  beforeEach(() => {
    store = memoryStore();
    setAuditStore(store);
  });

  afterEach(() => {
    resetAuditStore();
  });

  test("admin sees one academy summary and the view is logged", async () => {
    await recordAlterAudit({
      academyId: "academy-a",
      userId: "teacher-1",
      role: "teacher",
      skillId: "web_search",
      decision: "deny",
      reasonCode: "FLAG_OFF",
      costEstimate: 3,
      query: "서울 날씨",
    });
    await recordAlterAudit({
      academyId: "academy-b",
      userId: "teacher-2",
      role: "teacher",
      skillId: "form-draft",
      decision: "propose",
      costEstimate: 9,
    });
    const first = await viewAlterAudits({
      user: { _id: "admin-1", auth: "admin" },
      academyId: "academy-a",
      queryAcademyId: "academy-b",
    });
    expect(first.records).toHaveLength(1);
    expect(first.records[0].skillId).toBe("web_search");
    expect(first.records[0].costEstimate).toBeUndefined();
    expect(first.records[0].academyId).toBeUndefined();
    expect(first.metrics.calls).toBe(1);
    expect(first.metrics.denies).toBe(1);
    expect(first.metrics.costEstimate).toBeUndefined();
    expect(first.metrics.bySkill.web_search.denyRate).toBe(1);
    const logged = store.rows.filter((row) => row.decision === "view");
    expect(logged).toHaveLength(1);
    expect(logged[0].academyId).toBe("academy-a");
    expect(logged[0].viewAcademyId).toBe("academy-a");
    expect(logged[0].reasonCode).toBe("AUDIT_VIEW");

    const second = await viewAlterAudits({
      user: { _id: "admin-1", auth: "admin" },
      academyId: "academy-a",
    });
    expect(second.records.some((row) => row.decision === "view" && row.userId === "admin-1")).toBe(true);
    expect(second.metrics.calls).toBe(1);
  });

  test("owner sees every academy and the cost, and expired rows are purged", async () => {
    const live = await recordAlterAudit({
      academyId: "academy-a",
      skillId: "generate_image",
      decision: "propose",
      costEstimate: 1,
      createdAt: "2026-05-01T00:00:00.000Z",
    });
    await recordAlterAudit({
      academyId: "academy-b",
      skillId: "form-draft",
      decision: "execute",
      costEstimate: 0,
      createdAt: "2020-05-01T00:00:00.000Z",
    });
    expect(auditIsExpired(store.rows.find((row) => row.academyId === "academy-b"))).toBe(true);
    const viewed = await viewAlterAudits({
      user: { _id: "owner-1", auth: "owner" },
      academyId: "academy-a",
    });
    expect(viewed.records.map((row) => row.skillId)).toEqual(["generate_image"]);
    expect(viewed.records[0].costEstimate).toBe(1);
    expect(viewed.records[0].expiresAt).toEqual(live.expiresAt);
    expect(viewed.metrics.costEstimate).toBe(1);
    const removed = await purgeAllExpiredAudits(new Date());
    expect(removed).toBe(1);
    expect(store.rows.some((row) => row.academyId === "academy-b" && row.decision === "execute")).toBe(false);
    const after = await viewAlterAudits({
      user: { _id: "owner-1", auth: "owner" },
      academyId: "academy-a",
      queryAcademyId: "academy-a",
    });
    expect(after.metrics.purged).toBe(1);
    expect(after.records.some((row) => row.academyId === "academy-b")).toBe(false);
  });

  test("manager cannot view and there is no export helper", async () => {
    await expect(
      viewAlterAudits({ user: { _id: "manager-1", auth: "manager" }, academyId: "academy-a" })
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    await expect(
      viewAlterAudits({ user: { _id: "teacher-1", auth: "member" }, academyId: "academy-a" })
    ).rejects.toMatchObject({ status: 403 });
    expect(store.rows.filter((row) => row.decision === "view")).toHaveLength(0);
  });
});
