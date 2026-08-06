import {
  formatBytes,
  formatDate,
  formatDeltaPercent,
  formatNumber,
  getDeltaTone,
  responseTimeStatus,
} from "./dashboardFormat";

describe("dashboardFormat", () => {
  test("formatBytes and formatNumber", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatNumber(1773)).toBe((1773).toLocaleString());
  });

  test("formatDate", () => {
    expect(formatDate("2026-08-07")).toBe("8/7");
  });

  test("delta helpers", () => {
    expect(getDeltaTone({ absolute: 5, percent: 10 })).toBe("up");
    expect(getDeltaTone({ absolute: -5, percent: -10 })).toBe("down");
    expect(getDeltaTone({ absolute: -5, percent: -10 }, true)).toBe("up");
    expect(getDeltaTone({ absolute: 0, percent: 0 })).toBe("flat");
    expect(getDeltaTone({ absolute: null, percent: null })).toBe("none");
    expect(formatDeltaPercent({ absolute: 1, percent: 12.5 })).toBe("+12.5%");
    expect(formatDeltaPercent({ absolute: -1, percent: -3 })).toBe("-3%");
    expect(formatDeltaPercent({ absolute: null, percent: null })).toBeNull();
  });

  test("responseTimeStatus thresholds", () => {
    expect(responseTimeStatus(176)).toBe("success");
    expect(responseTimeStatus(350)).toBe("warning");
    expect(responseTimeStatus(800)).toBe("error");
  });
});
