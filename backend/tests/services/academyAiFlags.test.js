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

    const ownerImage = { aiEnabled: true, imageGenEnabled: false };
    applyAcademyAiFlags(ownerImage, { imageGenEnabled: true }, { owner: true });
    expect(ownerImage.imageGenEnabled).toBe(true);
    expect(ownerImage.aiEnabled).toBe(true);

    const adminImage = { aiEnabled: true, imageGenEnabled: false, alterEventTriggersEnabled: false };
    const imageDenied = applyAcademyAiFlags(adminImage, { imageGenEnabled: true }, { owner: false });
    expect(imageDenied.status).toBe(403);
    expect(adminImage.imageGenEnabled).toBe(false);

    const both = { aiEnabled: true, webSearchEnabled: false, imageGenEnabled: true, alterEventTriggersEnabled: false };
    const bundled = applyAcademyAiFlags(
      both,
      { alterEventTriggersEnabled: true, webSearchEnabled: true },
      { owner: false }
    );
    expect(bundled.status).toBe(403);
    expect(both.alterEventTriggersEnabled).toBe(false);
    expect(both.webSearchEnabled).toBe(false);

    const malformed = { aiEnabled: true, webSearchEnabled: false, imageGenEnabled: false };
    applyAcademyAiFlags(malformed, { webSearchEnabled: "true", imageGenEnabled: 1 }, { owner: true });
    expect(malformed.webSearchEnabled).toBe(false);
    expect(malformed.imageGenEnabled).toBe(false);
    expect(malformed.aiEnabled).toBe(true);

    const pair = { aiEnabled: false, webSearchEnabled: false, imageGenEnabled: false };
    applyAcademyAiFlags(pair, { webSearchEnabled: true, imageGenEnabled: false }, { owner: true });
    expect(pair).toMatchObject({ aiEnabled: false, webSearchEnabled: true, imageGenEnabled: false });
  });
});
