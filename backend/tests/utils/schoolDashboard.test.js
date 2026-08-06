import {
  absoluteDelta,
  aggregateAiDaily,
  aggregateTraffic,
  buildFieldDeltas,
  getDateKeys,
  getPreviousDateKeys,
  parseDashboardQuery,
  percentDelta,
  toDateKey,
} from "../../src/services/schoolDashboard.js";

describe("parseDashboardQuery", () => {
  test("defaults invalid values", () => {
    expect(parseDashboardQuery(undefined, undefined)).toEqual({
      period: 7,
      scope: "school",
    });
    expect(parseDashboardQuery("99", "galaxy")).toEqual({
      period: 7,
      scope: "school",
    });
  });

  test("accepts allowed values", () => {
    expect(parseDashboardQuery("14", "academy")).toEqual({
      period: 14,
      scope: "academy",
    });
    expect(parseDashboardQuery(30, "school")).toEqual({
      period: 30,
      scope: "school",
    });
  });
});

describe("date keys", () => {
  test("getDateKeys returns period-length inclusive UTC window ending today", () => {
    const now = new Date("2026-08-07T15:00:00.000Z");
    const keys = getDateKeys(7, now);
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe("2026-08-01");
    expect(keys[6]).toBe("2026-08-07");
  });

  test("getPreviousDateKeys is the UTC window immediately before current", () => {
    const now = new Date("2026-08-07T15:00:00.000Z");
    const prev = getPreviousDateKeys(7, now);
    expect(prev).toHaveLength(7);
    expect(prev[0]).toBe("2026-07-25");
    expect(prev[6]).toBe("2026-07-31");
  });

  test("toDateKey matches RequestStat UTC YMD", () => {
    expect(toDateKey(new Date("2026-01-05T12:00:00.000Z"))).toBe("2026-01-05");
  });
});

describe("deltas", () => {
  test("absoluteDelta and percentDelta handle edges", () => {
    expect(absoluteDelta(10, 7)).toBe(3);
    expect(absoluteDelta(10, null)).toBeNull();
    expect(percentDelta(12, 10)).toBe(20);
    expect(percentDelta(10, 0)).toBeNull();
  });

  test("aggregate helpers and buildFieldDeltas", () => {
    const traffic = aggregateTraffic([
      { requests: 10, avgResponseTime: 100, dataOut: 5, uniqueUsers: 2 },
      { requests: 30, avgResponseTime: 200, dataOut: 15, uniqueUsers: 4 },
    ]);
    expect(traffic.requests).toBe(40);
    expect(traffic.avgResponseTime).toBe(175);
    expect(traffic.dataOut).toBe(20);
    expect(traffic.uniqueUsers).toBe(6);

    const ai = aggregateAiDaily([
      { requests: 1, totalTokens: 100 },
      { requests: 2, totalTokens: 50 },
    ]);
    expect(ai).toEqual({ requests: 3, totalTokens: 150 });

    const deltas = buildFieldDeltas(
      { requests: 40, dataOut: 20 },
      { requests: 20, dataOut: 40 }
    );
    expect(deltas.requests.absolute).toBe(20);
    expect(deltas.requests.percent).toBe(100);
    expect(deltas.dataOut.absolute).toBe(-20);
    expect(deltas.dataOut.percent).toBe(-50);
  });
});
