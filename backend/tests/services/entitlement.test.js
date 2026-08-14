const distinctMock = jest.fn();
const seasonFindMock = jest.fn();

jest.mock("../../src/models/index.js", () => ({
  Registration: jest.fn(),
  Season: jest.fn(),
}));

import { Registration, Season } from "../../src/models/index.js";
import {
  ACADEMY_TOKEN_LIMIT,
  PLAN_CTRL_REQUIRED,
  PLAN_SHIFT_REQUIRED,
  SEASON_SEAT_LIMIT,
  STORAGE_LIMIT,
} from "../../src/messages/index.js";
import {
  assertAltSeats,
  assertCtrlTokens,
  assertShiftEnabled,
  assertShiftStorage,
  listActiveSeasonWarnings,
  normalizePlans,
  parsePlanPatch,
  priceOf,
  rollCtrlUsedTokens,
  SEAT_UNIT_PRICE,
  STORAGE_UNIT_BYTES,
  STORAGE_UNIT_PRICE,
  TOKEN_UNIT,
  TOKEN_UNIT_PRICE,
  suggestedLimits,
} from "../../src/services/entitlement.js";

beforeEach(() => {
  Registration.mockImplementation(() => ({
    distinct: (...args) => distinctMock(...args),
  }));
  Season.mockImplementation(() => ({
    find: (...args) => seasonFindMock(...args),
  }));
});

describe("entitlement", () => {
  test("normalizePlans infers modules from feature flags when plans missing", () => {
    const inferred = normalizePlans({
      boardEnabled: true,
      chatEnabled: false,
      sitePublishEnabled: false,
      aiEnabled: true,
    });
    expect(inferred.alt.enabled).toBe(true);
    expect(inferred.shift.enabled).toBe(true);
    expect(inferred.ctrl.enabled).toBe(true);
    expect(inferred.alt.seasonSeatLimit).toBeNull();
  });

  test("rollCtrlUsedTokens zeros usage when the Seoul month changes", () => {
    const kept = rollCtrlUsedTokens(
      { usedTokens: 50, usageMonth: "2026-08" },
      new Date("2026-08-14T15:00:00.000Z")
    );
    expect(kept.usedTokens).toBe(50);
    expect(kept.usageMonth).toBe("2026-08");
    const rolled = rollCtrlUsedTokens(
      { usedTokens: 50, usageMonth: "2026-07" },
      new Date("2026-08-14T15:00:00.000Z")
    );
    expect(rolled.usedTokens).toBe(0);
    expect(rolled.usageMonth).toBe("2026-08");
  });

  test("normalizePlans uses explicit plans over flags", () => {
    const n = normalizePlans({
      aiEnabled: true,
      boardEnabled: true,
      plans: {
        alt: { enabled: true, seasonSeatLimit: 100 },
        shift: { enabled: false, storageLimitBytes: null, usedBytes: 0 },
        ctrl: { enabled: false, tokenLimit: null, usedTokens: 0 },
      },
    });
    expect(n.shift.enabled).toBe(false);
    expect(n.ctrl.enabled).toBe(false);
    expect(n.alt.seasonSeatLimit).toBe(100);
  });

  test("normalizePlans fills default unit prices", () => {
    const n = normalizePlans({
      plans: {
        alt: { enabled: true, seasonSeatLimit: 101 },
        shift: { enabled: true, storageLimitBytes: 1 },
        ctrl: { enabled: true, tokenLimit: 1, usedTokens: 0 },
      },
    });
    expect(n.alt.unitPrice).toBe(SEAT_UNIT_PRICE);
    expect(n.shift.unitPrice).toBe(STORAGE_UNIT_PRICE);
    expect(n.ctrl.unitPrice).toBe(TOKEN_UNIT_PRICE);
    expect(n.alt.seasonSeatLimit).toBe(101);
  });

  test("priceOf charges by unit and custom unitPrice", () => {
    const price = priceOf({
      alt: { enabled: true, seasonSeatLimit: 200 },
      shift: { enabled: true, storageLimitBytes: STORAGE_UNIT_BYTES * 2 },
      ctrl: { enabled: true, tokenLimit: TOKEN_UNIT },
    });
    expect(price.alt).toBe(2 * SEAT_UNIT_PRICE);
    expect(price.shift).toBe(2 * STORAGE_UNIT_PRICE);
    expect(price.ctrl).toBe(TOKEN_UNIT_PRICE);

    expect(
      priceOf({
        alt: { enabled: true, seasonSeatLimit: 101, unitPrice: 1000 },
        shift: { enabled: true, storageLimitBytes: 1, unitPrice: 500 },
        ctrl: { enabled: true, tokenLimit: 1, unitPrice: 2000 },
      })
    ).toEqual({ alt: 2000, shift: 500, ctrl: 2000 });
  });

  test("priceOf is zero when module off or limit null", () => {
    expect(
      priceOf({
        alt: { enabled: false, seasonSeatLimit: 100 },
        shift: { enabled: true, storageLimitBytes: null },
        ctrl: { enabled: true, tokenLimit: null },
      })
    ).toEqual({ alt: 0, shift: 0, ctrl: 0 });
  });

  test("parsePlanPatch keeps ones-place limits and unit prices", () => {
    const patch = parsePlanPatch({
      alt: { seasonSeatLimit: 101, unitPrice: 25000 },
      shift: { storageLimitBytes: 1, unitPrice: 8000 },
      ctrl: { tokenLimit: 1, unitPrice: 0, resetUsage: true },
    });
    expect(patch.alt.seasonSeatLimit).toBe(101);
    expect(patch.alt.unitPrice).toBe(25000);
    expect(patch.shift.storageLimitBytes).toBe(1);
    expect(patch.shift.unitPrice).toBe(8000);
    expect(patch.ctrl.tokenLimit).toBe(1);
    expect(patch.ctrl.unitPrice).toBe(0);
    expect(patch.ctrl.resetUsage).toBe(true);
  });

  test("suggestedLimits rounds usage up", () => {
    const s = suggestedLimits({ seats: 101, bytes: 1, tokens: 1 });
    expect(s.seasonSeatLimit).toBe(200);
    expect(s.storageLimitBytes).toBe(STORAGE_UNIT_BYTES);
    expect(s.tokenLimit).toBe(TOKEN_UNIT);
  });

  test("assertShiftEnabled and storage", () => {
    expect(() =>
      assertShiftEnabled({
        plans: { shift: { enabled: false } },
      })
    ).toThrow(PLAN_SHIFT_REQUIRED);

    expect(() =>
      assertShiftStorage(
        {
          plans: {
            shift: {
              enabled: true,
              storageLimitBytes: 100,
              usedBytes: 90,
            },
          },
        },
        { addBytes: 20 }
      )
    ).toThrow(STORAGE_LIMIT);

    expect(() =>
      assertShiftStorage(
        {
          plans: {
            shift: { enabled: true, storageLimitBytes: null, usedBytes: 999 },
          },
        },
        { addBytes: 20 }
      )
    ).not.toThrow();
  });

  test("assertCtrlTokens", () => {
    expect(() => assertCtrlTokens({ plans: { ctrl: { enabled: false } } })).toThrow(
      PLAN_CTRL_REQUIRED
    );
    expect(() =>
      assertCtrlTokens({
        plans: { ctrl: { enabled: true, tokenLimit: 10, usedTokens: 10 } },
      })
    ).toThrow(ACADEMY_TOKEN_LIMIT);
    expect(() =>
      assertCtrlTokens({
        plans: { ctrl: { enabled: true, tokenLimit: 10, usedTokens: 9 } },
      })
    ).not.toThrow();
    expect(() =>
      assertCtrlTokens(
        {
          plans: { ctrl: { enabled: true, tokenLimit: 10, usedTokens: 8 } },
        },
        { addTokens: 3 }
      )
    ).toThrow(ACADEMY_TOKEN_LIMIT);
  });

  test("assertAltSeats skips when limit is null or module off", async () => {
    await expect(
      assertAltSeats("acad", { plans: { alt: { enabled: true, seasonSeatLimit: null } } }, {
        addUserIds: ["u1"],
      })
    ).resolves.toBeUndefined();
    await expect(
      assertAltSeats(
        "acad",
        { plans: { alt: { enabled: false, seasonSeatLimit: 100 } } },
        { addUserIds: ["u1"] }
      )
    ).resolves.toBeUndefined();
    expect(distinctMock).not.toHaveBeenCalled();
  });

  test("assertAltSeats ignores users who already occupy a seat", async () => {
    distinctMock.mockImplementation((_field, filter) => {
      if (filter.user?.$in) return Promise.resolve(["u1"]);
      return Promise.resolve(["u1", "u2"]);
    });
    await expect(
      assertAltSeats(
        "acad",
        { plans: { alt: { enabled: true, seasonSeatLimit: 2 } } },
        { addUserIds: ["u1"] }
      )
    ).resolves.toBeUndefined();
  });

  test("assertAltSeats rejects when distinct active users would exceed the limit", async () => {
    distinctMock.mockImplementation((_field, filter) => {
      if (filter.user?.$in) return Promise.resolve([]);
      return Promise.resolve(Array.from({ length: 100 }, (_, i) => `u${i}`));
    });
    await expect(
      assertAltSeats(
        "acad",
        { plans: { alt: { enabled: true, seasonSeatLimit: 100 } } },
        { addUserIds: ["new-user"] }
      )
    ).rejects.toMatchObject({ code: SEASON_SEAT_LIMIT, status: 403 });
  });

  test("listActiveSeasonWarnings only includes schools with 2+ active seasons", async () => {
    seasonFindMock.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve([
            {
              _id: "1",
              school: "s1",
              schoolId: "a",
              schoolName: "가온",
              year: "2024",
              term: "1",
            },
            {
              _id: "2",
              school: "s1",
              schoolId: "a",
              schoolName: "가온",
              year: "2025",
              term: "1",
            },
            {
              _id: "3",
              school: "s2",
              schoolId: "b",
              schoolName: "나래",
              year: "2025",
              term: "1",
            },
          ]),
      }),
    });
    const warnings = await listActiveSeasonWarnings("acad");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].schoolName).toBe("가온");
    expect(warnings[0].seasons).toHaveLength(2);
  });

  test("error codes are stable", () => {
    expect(SEASON_SEAT_LIMIT).toBe("SEASON_SEAT_LIMIT");
    expect(STORAGE_LIMIT).toBe("STORAGE_LIMIT");
  });
});
