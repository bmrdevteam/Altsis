import {
  SEAT_UNIT,
  SEAT_UNIT_PRICE,
  STORAGE_UNIT_BYTES,
  TOKEN_UNIT,
  TOKEN_UNIT_ALTS,
  TOKENS_PER_ALT,
  GIB_BYTES,
  seatUnits,
  storageUnits,
  tokenUnits,
  formatKrw,
  formatAltCount,
  priceForLimit,
  bytesToGiB,
  giBToBytes,
  clampUnitPrice,
  usageBarTone,
  tokensToAlts,
  altsToTokens,
  tokensToAltLimit,
} from "./planPricing";

describe("planPricing", () => {
  test("seat and token units round up", () => {
    expect(seatUnits(1)).toBe(1);
    expect(seatUnits(100)).toBe(1);
    expect(seatUnits(101)).toBe(2);
    expect(seatUnits(null)).toBe(0);
    expect(tokenUnits(TOKEN_UNIT)).toBe(1);
    expect(tokenUnits(TOKEN_UNIT + 1)).toBe(2);
  });

  test("storage units use 100GiB", () => {
    expect(storageUnits(STORAGE_UNIT_BYTES)).toBe(1);
    expect(storageUnits(STORAGE_UNIT_BYTES - 1)).toBe(1);
    expect(storageUnits(0)).toBe(0);
  });

  test("formatKrw", () => {
    expect(formatKrw(SEAT_UNIT_PRICE)).toBe("30,000원");
  });

  test("Alt conversion is 10000 tokens per Alt", () => {
    expect(TOKENS_PER_ALT).toBe(10_000);
    expect(TOKEN_UNIT_ALTS).toBe(10_000);
    expect(tokensToAlts(0)).toBe(0);
    expect(tokensToAlts(10_000)).toBe(1);
    expect(tokensToAlts(5_000)).toBe(0.5);
    expect(tokensToAlts(10_000_000)).toBe(1_000);
    expect(altsToTokens(1)).toBe(10_000);
    expect(altsToTokens(10_000)).toBe(TOKEN_UNIT);
    expect(tokensToAltLimit(null)).toBeNull();
    expect(tokensToAltLimit(1)).toBe(1);
    expect(tokensToAltLimit(10_000_000)).toBe(1_000);
    expect(formatAltCount(0)).toBe("0");
    expect(formatAltCount(0.5)).toBe("0.5");
    expect(formatAltCount(1_000)).toBe((1000).toLocaleString("ko-KR"));
  });

  test("priceForLimit uses ones-place limits and custom unit price", () => {
    expect(priceForLimit(101, SEAT_UNIT, 1000)).toBe(2000);
    expect(priceForLimit(null, SEAT_UNIT, 30000)).toBe(0);
    expect(bytesToGiB(STORAGE_UNIT_BYTES)).toBe(100);
    expect(giBToBytes(1)).toBe(GIB_BYTES);
    expect(clampUnitPrice(-1, 30000)).toBe(0);
  });

  test("usageBarTone uses 70/80 percent bands", () => {
    expect(usageBarTone(0)).toBe("ok");
    expect(usageBarTone(0.7)).toBe("ok");
    expect(usageBarTone(0.71)).toBe("caution");
    expect(usageBarTone(0.79)).toBe("caution");
    expect(usageBarTone(0.8)).toBe("danger");
    expect(usageBarTone(1.2)).toBe("danger");
  });
});
