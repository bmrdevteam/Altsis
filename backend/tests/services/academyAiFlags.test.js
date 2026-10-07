import { applyAcademyAiFlags } from "../../src/services/academyAiFlags.js";

describe("academy AI flags", () => {
  test("web search stays off unless an owner sets it, and that body does not flip AI", () => {
    const owner = { aiEnabled: true, alterEventTriggersEnabled: false, webSearchEnabled: false };
    applyAcademyAiFlags(owner, { webSearchEnabled: true }, { owner: true });
    expect(owner.webSearchEnabled).toBe(true);
    expect(owner.aiEnabled).toBe(true);

    const toggle = { aiEnabled: true, webSearchEnabled: false };
    applyAcademyAiFlags(toggle, {}, { owner: true });
    expect(toggle.aiEnabled).toBe(false);

    const admin = { aiEnabled: true, alterEventTriggersEnabled: false, webSearchEnabled: false };
    const denied = applyAcademyAiFlags(admin, { webSearchEnabled: true }, { owner: false });
    expect(denied.status).toBe(403);
    expect(admin.webSearchEnabled).toBe(false);

    const events = { aiEnabled: true, alterEventTriggersEnabled: false, webSearchEnabled: false };
    const applied = applyAcademyAiFlags(events, { alterEventTriggersEnabled: true }, { owner: false });
    expect(applied.eventOnly).toBe(true);
    expect(events.alterEventTriggersEnabled).toBe(true);
    expect(events.webSearchEnabled).toBe(false);
  });
});
