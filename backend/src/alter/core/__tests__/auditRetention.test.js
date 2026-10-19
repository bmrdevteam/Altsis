import { auditExpiresAt, auditIsExpired, projectAudit, schoolYearOf, summarizeAudits, toAuditRecord, AUDIT_VIEW } from "../auditRetention.js";

describe("audit retention", () => {
  test("a record expires at the end of the next school year", () => {
    expect(schoolYearOf("2026-05-01T00:00:00.000Z")).toBe(2026);
    expect(schoolYearOf("2026-02-15T00:00:00.000Z")).toBe(2025);
    const expires = auditExpiresAt("2026-05-01T00:00:00.000Z");
    expect(expires.toISOString()).toBe("2028-02-29T23:59:59.999Z");
    expect(auditIsExpired({ expiresAt: expires }, new Date("2028-03-01T00:00:00.000Z"))).toBe(true);
    expect(auditIsExpired({ expiresAt: expires }, new Date("2028-02-01T00:00:00.000Z"))).toBe(false);
  });

  test("owner and admin do not see the same fields", () => {
    const row = toAuditRecord({
      academyId: "academy-a",
      userId: "user-1",
      role: "teacher",
      skillId: "web_search",
      decision: "execute",
      reasonCode: "ALLOW",
      costEstimate: 1,
      query: "010-1234-5678 날씨",
      prompt: "원문 프롬프트는 저장하지 않는다",
      modelResponse: "원문 응답",
    });
    expect(row.prompt).toBeUndefined();
    expect(row.modelResponse).toBeUndefined();
    expect(row.maskedQuery).toContain("[연락처]");
    expect(row.maskedQuery).not.toContain("010-");
    expect(projectAudit(row, "admin").costEstimate).toBeUndefined();
    expect(projectAudit(row, "admin").skillId).toBe("web_search");
    expect(projectAudit(row, "owner").costEstimate).toBe(1);
    expect(projectAudit(row, "manager")).toBeNull();
    expect(AUDIT_VIEW.owner.scope).toBe("all-academies");
    expect(AUDIT_VIEW.admin.scope).toBe("own-academy");
    expect(AUDIT_VIEW.manager.scope).toBe("none");
  });

  test("a log view is not counted as a skill call", () => {
    const metrics = summarizeAudits(
      [
        { skillId: "form-draft", decision: "deny", costEstimate: 1 },
        { skillId: "form-draft", decision: "propose", costEstimate: 0 },
        { skillId: "", decision: "view" },
      ],
      { includeCost: true }
    );
    expect(metrics.calls).toBe(2);
    expect(metrics.denies).toBe(1);
    expect(metrics.denyRate).toBe(0.5);
    expect(metrics.bySkill["form-draft"].calls).toBe(2);
    expect(metrics.costEstimate).toBe(1);
  });
});
