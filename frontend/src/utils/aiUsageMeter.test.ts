import { TMyAiUsage } from "types/dashboard";
import { getUsageMeter } from "./aiUsageMeter";

const usage = (partial: Partial<TMyAiUsage>): TMyAiUsage => ({
  period: "day",
  usedTokens: 0,
  usedAlts: 0,
  requests: 0,
  limitEnabled: false,
  limitAlts: null,
  remainingAlts: null,
  tokensPerAlt: 10000,
  ...partial,
});

describe("getUsageMeter", () => {
  test("no limit when disabled or missing", () => {
    expect(getUsageMeter(usage({ usedAlts: 1.2, limitEnabled: false }))).toEqual({
      used: 1.2,
      limit: null,
      ratio: null,
      exceeded: false,
      warn: false,
    });
    expect(
      getUsageMeter(usage({ usedAlts: 2, limitEnabled: true, limitAlts: 0 }))
    ).toMatchObject({ limit: null, exceeded: false, warn: false });
  });

  test("warns at 80% of the daily limit", () => {
    const meter = getUsageMeter(
      usage({ usedAlts: 0.8, limitEnabled: true, limitAlts: 1 })
    );
    expect(meter.warn).toBe(true);
    expect(meter.exceeded).toBe(false);
    expect(meter.ratio).toBe(0.8);
  });

  test("marks exceeded at or above the limit", () => {
    expect(
      getUsageMeter(usage({ usedAlts: 1, limitEnabled: true, limitAlts: 1 }))
    ).toMatchObject({ exceeded: true, warn: false, ratio: 1 });
    expect(
      getUsageMeter(usage({ usedAlts: 1.5, limitEnabled: true, limitAlts: 1 }))
    ).toMatchObject({ exceeded: true, ratio: 1 });
  });
});
