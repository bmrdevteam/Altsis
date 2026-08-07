import {
  getDayWindowUTC,
  normalizeAiUsageLimits,
  assertAiUserQuota,
  tokensToAlts,
  altsToTokens,
  TOKENS_PER_ALT,
} from "../../src/services/aiUsageQuota.js";
import { AI_ERRORS } from "../../src/services/aiPromptPolicy.js";

describe("aiUsageQuota", () => {
  test("TOKENS_PER_ALT is 10000", () => {
    expect(TOKENS_PER_ALT).toBe(10000);
  });

  test("tokensToAlts and altsToTokens", () => {
    expect(tokensToAlts(10000)).toBe(1);
    expect(tokensToAlts(5000)).toBe(0.5);
    expect(altsToTokens(1)).toBe(10000);
    expect(altsToTokens(0.5)).toBe(5000);
  });

  test("getDayWindowUTC returns UTC day bounds", () => {
    const { from, to } = getDayWindowUTC(
      new Date("2026-08-15T12:00:00.000Z")
    );
    expect(from.toISOString()).toBe("2026-08-15T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-08-16T00:00:00.000Z");
  });

  test("normalizeAiUsageLimits", () => {
    expect(normalizeAiUsageLimits(undefined)).toEqual({
      enabled: false,
      dailyUserAlts: 0,
    });
    expect(
      normalizeAiUsageLimits({ enabled: true, dailyUserAlts: 1.55555 })
    ).toEqual({ enabled: true, dailyUserAlts: 1.5556 });
    expect(
      normalizeAiUsageLimits({ enabled: true, monthlyUserTokens: 10000 })
    ).toEqual({ enabled: true, dailyUserAlts: 1 });
  });

  test("assertAiUserQuota skips when disabled or zero limit", async () => {
    await expect(
      assertAiUserQuota(
        "acad",
        { _id: "507f1f77bcf86cd799439011" },
        { aiUsageLimits: { enabled: false, dailyUserAlts: 1 } }
      )
    ).resolves.toBeUndefined();

    await expect(
      assertAiUserQuota(
        "acad",
        { _id: "507f1f77bcf86cd799439011" },
        { aiUsageLimits: { enabled: true, dailyUserAlts: 0 } }
      )
    ).resolves.toBeUndefined();
  });

  test("USAGE_LIMIT_EXCEEDED error code is defined", () => {
    expect(AI_ERRORS.USAGE_LIMIT_EXCEEDED).toBe("AI_USAGE_LIMIT_EXCEEDED");
  });
});
