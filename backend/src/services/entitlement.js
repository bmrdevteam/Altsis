/**
 * 아카데미 ALT / SHIFT / CTRL 요금제 한도
 */
import {
  ACADEMY_TOKEN_LIMIT,
  PLAN_CTRL_REQUIRED,
  PLAN_SHIFT_REQUIRED,
  SEASON_SEAT_LIMIT,
  STORAGE_LIMIT,
} from "../messages/index.js";

export const SEAT_UNIT = 100;
export const SEAT_UNIT_PRICE = 30_000;
export const GIB_BYTES = 1024 * 1024 * 1024;
export const STORAGE_UNIT_BYTES = 100 * GIB_BYTES;
export const STORAGE_UNIT_PRICE = 10_000;
export const TOKEN_UNIT = 100_000_000;
export const TOKEN_UNIT_PRICE = 10_000;
export const MAX_UNIT_PRICE = 1_000_000_000;

export function planError(code, status = 403) {
  const err = new Error(code);
  err.status = status;
  err.code = code;
  return err;
}

export function isPlanError(err) {
  return !!(err && err.code && err.status);
}

export function sendPlanError(res, err) {
  if (!isPlanError(err)) return false;
  res.status(err.status).send({ message: err.code });
  return true;
}

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
};

const roundUpUnit = (value, unit) => {
  const n = Math.max(0, Number(value) || 0);
  if (n === 0) return 0;
  return Math.ceil(n / unit) * unit;
};

const clampLimit = (value) => {
  const n = toNullableNumber(value);
  if (n == null || n <= 0) return null;
  return Math.max(1, Math.floor(n));
};

export function normalizeUnitPrice(value, fallback) {
  const n = toNullableNumber(value);
  if (n == null) return fallback;
  return Math.max(0, Math.min(MAX_UNIT_PRICE, Math.floor(n)));
}

/** Asia/Seoul 기준 YYYY-MM. CTRL 토큰 한도는 이 달의 사용량이다. */
export function currentCtrlUsageMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

export function rollCtrlUsedTokens(ctrl = {}, now = new Date()) {
  const month = currentCtrlUsageMonth(now);
  const prev = typeof ctrl.usageMonth === "string" ? ctrl.usageMonth : "";
  const usedTokens = Math.max(0, Math.floor(Number(ctrl.usedTokens) || 0));
  if (!prev) {
    return { ...ctrl, usageMonth: month, usedTokens };
  }
  if (prev !== month) {
    return { ...ctrl, usageMonth: month, usedTokens: 0 };
  }
  return { ...ctrl, usageMonth: month, usedTokens };
}

/**
 * 기존 아카데미 문서(plans 없음)도 기능 플래그로 모듈 on/off를 추론한다.
 */
export function normalizePlans(academy) {
  const p = academy?.plans || {};
  const hasExplicit =
    p.alt != null || p.shift != null || p.ctrl != null;

  const altEnabled = p.alt?.enabled !== false;
  const shiftEnabled = hasExplicit
    ? !!p.shift?.enabled
    : !!(
        academy?.boardEnabled ||
        academy?.chatEnabled ||
        academy?.sitePublishEnabled
      );
  const ctrlEnabled = hasExplicit ? !!p.ctrl?.enabled : !!academy?.aiEnabled;

  const seasonSeatLimit = toNullableNumber(p.alt?.seasonSeatLimit);
  const storageLimitBytes = toNullableNumber(p.shift?.storageLimitBytes);
  const tokenLimit = toNullableNumber(p.ctrl?.tokenLimit);
  const ctrlUsage = rollCtrlUsedTokens(p.ctrl);

  return {
    alt: {
      enabled: altEnabled,
      seasonSeatLimit:
        seasonSeatLimit == null ? null : Math.max(0, Math.floor(seasonSeatLimit)),
      unitPrice: normalizeUnitPrice(p.alt?.unitPrice, SEAT_UNIT_PRICE),
    },
    shift: {
      enabled: shiftEnabled,
      storageLimitBytes:
        storageLimitBytes == null
          ? null
          : Math.max(0, Math.floor(storageLimitBytes)),
      usedBytes: Math.max(0, Math.floor(Number(p.shift?.usedBytes) || 0)),
      usageSyncedAt: p.shift?.usageSyncedAt || null,
      unitPrice: normalizeUnitPrice(p.shift?.unitPrice, STORAGE_UNIT_PRICE),
    },
    ctrl: {
      enabled: ctrlEnabled,
      tokenLimit:
        tokenLimit == null ? null : Math.max(0, Math.floor(tokenLimit)),
      usedTokens: ctrlUsage.usedTokens,
      usageMonth: ctrlUsage.usageMonth,
      unitPrice: normalizeUnitPrice(p.ctrl?.unitPrice, TOKEN_UNIT_PRICE),
    },
  };
}

export function priceOf(plans) {
  const n = plans?.alt ? plans : normalizePlans({ plans });
  const altLimit = n.alt.seasonSeatLimit;
  const storageLimit = n.shift.storageLimitBytes;
  const tokenLimit = n.ctrl.tokenLimit;
  const altUnitPrice = normalizeUnitPrice(n.alt.unitPrice, SEAT_UNIT_PRICE);
  const shiftUnitPrice = normalizeUnitPrice(
    n.shift.unitPrice,
    STORAGE_UNIT_PRICE
  );
  const ctrlUnitPrice = normalizeUnitPrice(n.ctrl.unitPrice, TOKEN_UNIT_PRICE);
  return {
    alt:
      n.alt.enabled && altLimit != null
        ? (roundUpUnit(altLimit, SEAT_UNIT) / SEAT_UNIT) * altUnitPrice
        : 0,
    shift:
      n.shift.enabled && storageLimit != null
        ? (roundUpUnit(storageLimit, STORAGE_UNIT_BYTES) / STORAGE_UNIT_BYTES) *
          shiftUnitPrice
        : 0,
    ctrl:
      n.ctrl.enabled && tokenLimit != null
        ? (roundUpUnit(tokenLimit, TOKEN_UNIT) / TOKEN_UNIT) * ctrlUnitPrice
        : 0,
  };
}

export function suggestedLimits({ seats = 0, bytes = 0, tokens = 0 } = {}) {
  return {
    seasonSeatLimit: roundUpUnit(seats, SEAT_UNIT) || SEAT_UNIT,
    storageLimitBytes: roundUpUnit(bytes, STORAGE_UNIT_BYTES) || STORAGE_UNIT_BYTES,
    tokenLimit: roundUpUnit(tokens, TOKEN_UNIT) || TOKEN_UNIT,
  };
}

export function writePlansToAcademy(academy, next) {
  academy.plans = {
    alt: {
      enabled: next.alt.enabled,
      seasonSeatLimit: next.alt.seasonSeatLimit,
      unitPrice: normalizeUnitPrice(next.alt.unitPrice, SEAT_UNIT_PRICE),
    },
    shift: {
      enabled: next.shift.enabled,
      storageLimitBytes: next.shift.storageLimitBytes,
      usedBytes: next.shift.usedBytes || 0,
      usageSyncedAt: next.shift.usageSyncedAt || null,
      unitPrice: normalizeUnitPrice(next.shift.unitPrice, STORAGE_UNIT_PRICE),
    },
    ctrl: {
      enabled: next.ctrl.enabled,
      tokenLimit: next.ctrl.tokenLimit,
      usedTokens: next.ctrl.usedTokens || 0,
      usageMonth: next.ctrl.usageMonth || currentCtrlUsageMonth(),
      unitPrice: normalizeUnitPrice(next.ctrl.unitPrice, TOKEN_UNIT_PRICE),
    },
  };
  academy.aiEnabled = !!next.ctrl.enabled;
  if (typeof academy.markModified === "function") {
    academy.markModified("plans");
  }
}

/** 달이 바뀌면 이번 달 사용량을 0으로 맞추고, 없으면 현재 달을 기록한다. */
export async function persistCtrlUsageMonth(academy) {
  if (!academy) return normalizePlans(academy);
  const prevMonth = academy.plans?.ctrl?.usageMonth;
  const prevUsed = Math.max(
    0,
    Math.floor(Number(academy.plans?.ctrl?.usedTokens) || 0)
  );
  const plans = normalizePlans(academy);
  if (
    prevMonth === plans.ctrl.usageMonth &&
    prevUsed === plans.ctrl.usedTokens
  ) {
    return plans;
  }
  const current = academy.plans?.toObject?.() || academy.plans || {};
  academy.plans = {
    ...current,
    ctrl: {
      ...(current.ctrl || {}),
      usageMonth: plans.ctrl.usageMonth,
      usedTokens: plans.ctrl.usedTokens,
    },
  };
  if (typeof academy.markModified === "function") {
    academy.markModified("plans");
  }
  if (typeof academy.save === "function") {
    await academy.save();
  }
  return plans;
}

const toIdString = (id) => (id == null ? "" : String(id));

export async function countActiveSeats(academyId) {
  const { Registration } = await import("../models/index.js");
  const users = await Registration(academyId).distinct("user", {
    isActivated: true,
  });
  return users.length;
}

export async function listActiveSeasonWarnings(academyId) {
  const { Season } = await import("../models/index.js");
  const seasons = await Season(academyId)
    .find({ isActivated: true })
    .select("school schoolId schoolName year term")
    .lean();

  const bySchool = new Map();
  for (const season of seasons) {
    const key = toIdString(season.school);
    if (!bySchool.has(key)) {
      bySchool.set(key, {
        school: key,
        schoolId: season.schoolId,
        schoolName: season.schoolName,
        seasons: [],
      });
    }
    bySchool.get(key).seasons.push({
      _id: season._id,
      year: season.year,
      term: season.term,
    });
  }

  return [...bySchool.values()].filter((row) => row.seasons.length > 1);
}

/**
 * @param {string} academyId
 * @param {object} academy
 * @param {{ addUserIds?: Array }} [opts]
 */
export async function assertAltSeats(academyId, academy, opts = {}) {
  const plans = normalizePlans(academy);
  if (!plans.alt.enabled) return;
  if (plans.alt.seasonSeatLimit == null) return;

  const addUserIds = (opts.addUserIds || [])
    .map(toIdString)
    .filter(Boolean);
  if (addUserIds.length === 0) return;

  const { Registration } = await import("../models/index.js");
  const alreadyActive = await Registration(academyId).distinct("user", {
    isActivated: true,
    user: { $in: addUserIds },
  });
  const already = new Set(alreadyActive.map(toIdString));
  const newUserIds = [...new Set(addUserIds.filter((id) => !already.has(id)))];
  if (newUserIds.length === 0) return;

  const current = await countActiveSeats(academyId);
  if (current + newUserIds.length > plans.alt.seasonSeatLimit) {
    throw planError(SEASON_SEAT_LIMIT);
  }
}

export function assertShiftEnabled(academy) {
  const plans = normalizePlans(academy);
  if (!plans.shift.enabled) {
    throw planError(PLAN_SHIFT_REQUIRED);
  }
}

export function assertShiftStorage(academy, { addBytes = 0 } = {}) {
  const plans = normalizePlans(academy);
  if (plans.shift.storageLimitBytes == null) return;
  const next = plans.shift.usedBytes + Math.max(0, Number(addBytes) || 0);
  if (next > plans.shift.storageLimitBytes) {
    throw planError(STORAGE_LIMIT);
  }
}

export function assertCtrlEnabled(academy) {
  const plans = normalizePlans(academy);
  if (!plans.ctrl.enabled) {
    throw planError(PLAN_CTRL_REQUIRED);
  }
}

export function assertCtrlTokens(academy, { addTokens = 0 } = {}) {
  const plans = normalizePlans(academy);
  if (!plans.ctrl.enabled) {
    throw planError(PLAN_CTRL_REQUIRED);
  }
  if (plans.ctrl.tokenLimit == null) return;
  if (plans.ctrl.usedTokens >= plans.ctrl.tokenLimit) {
    throw planError(ACADEMY_TOKEN_LIMIT);
  }
  if (addTokens > 0 && plans.ctrl.usedTokens + addTokens > plans.ctrl.tokenLimit) {
    throw planError(ACADEMY_TOKEN_LIMIT);
  }
}

export function parsePlanPatch(body = {}) {
  const patch = {};
  if (body.alt && typeof body.alt === "object") {
    patch.alt = {};
    if (typeof body.alt.enabled === "boolean") {
      patch.alt.enabled = body.alt.enabled;
    }
    if ("seasonSeatLimit" in body.alt) {
      patch.alt.seasonSeatLimit = clampLimit(body.alt.seasonSeatLimit);
    }
    if ("unitPrice" in body.alt) {
      patch.alt.unitPrice = normalizeUnitPrice(
        body.alt.unitPrice,
        SEAT_UNIT_PRICE
      );
    }
  }
  if (body.shift && typeof body.shift === "object") {
    patch.shift = {};
    if (typeof body.shift.enabled === "boolean") {
      patch.shift.enabled = body.shift.enabled;
    }
    if ("storageLimitBytes" in body.shift) {
      patch.shift.storageLimitBytes = clampLimit(body.shift.storageLimitBytes);
    }
    if ("unitPrice" in body.shift) {
      patch.shift.unitPrice = normalizeUnitPrice(
        body.shift.unitPrice,
        STORAGE_UNIT_PRICE
      );
    }
  }
  if (body.ctrl && typeof body.ctrl === "object") {
    patch.ctrl = {};
    if (typeof body.ctrl.enabled === "boolean") {
      patch.ctrl.enabled = body.ctrl.enabled;
    }
    if ("tokenLimit" in body.ctrl) {
      patch.ctrl.tokenLimit = clampLimit(body.ctrl.tokenLimit);
    }
    if ("unitPrice" in body.ctrl) {
      patch.ctrl.unitPrice = normalizeUnitPrice(
        body.ctrl.unitPrice,
        TOKEN_UNIT_PRICE
      );
    }
    if (body.ctrl.resetUsage === true) {
      patch.ctrl.resetUsage = true;
    }
  }
  return patch;
}
