import { auditExpiresAt, schoolYearOf, AUDIT_VIEW } from "../auditRetention.js";

describe("audit retention", () => {
  test("a record expires at the end of the next school year", () => {
    expect(schoolYearOf("2026-05-01T00:00:00.000Z")).toBe(2026);
    expect(schoolYearOf("2026-02-15T00:00:00.000Z")).toBe(2025);
    const expires = auditExpiresAt("2026-05-01T00:00:00.000Z");
    expect(expires.toISOString()).toBe("2028-02-29T23:59:59.999Z");
  });

  test("owner and admin do not see the same fields", () => {
    expect(AUDIT_VIEW.owner.scope).toBe("all-academies");
    expect(AUDIT_VIEW.admin.scope).toBe("own-academy");
    expect(AUDIT_VIEW.admin.fields).not.toContain("costEstimate");
    expect(AUDIT_VIEW.manager.scope).toBe("none");
  });
});
