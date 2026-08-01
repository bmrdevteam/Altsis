/**
 * School.goalDisplay — 역할별 섹션 + 개별 항목 + 표시 순서
 *
 * items[itemId]:
 *   - boolean (레거시)
 *   - { enabled?: boolean, target?: number|null }
 * itemOrder: 켜진 항목의 표시 순서 (itemId[])
 */

export const DEFAULT_GOAL_DISPLAY = {
  student: {
    enrolled: true,
    archive: true,
    board: true,
    items: {},
    itemOrder: [],
  },
  teacher: {
    enrolled: true,
    created: true,
    mentoring: true,
    archive: true,
    board: true,
    items: {},
    itemOrder: [],
  },
};

const SECTION_KEYS = {
  student: ["enrolled", "archive", "board"],
  teacher: ["enrolled", "created", "mentoring", "archive", "board"],
};

const sanitizeItemEntry = (v) => {
  if (typeof v === "boolean") return v;
  if (v && typeof v === "object") {
    const pref = { enabled: v.enabled !== false, target: null };
    if (v.target != null && v.target !== "") {
      const n = Number(v.target);
      if (Number.isFinite(n) && n > 0) {
        pref.target = Math.min(Math.floor(n), 1_000_000);
      }
    }
    return pref;
  }
  return undefined;
};

const sanitizeItemOrder = (raw) => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const order = [];
  for (const id of raw) {
    if (typeof id !== "string" || id.length === 0 || id.length > 200) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
  }
  return order;
};

export const mergeGoalDisplay = (raw) => {
  const base = JSON.parse(JSON.stringify(DEFAULT_GOAL_DISPLAY));
  if (!raw || typeof raw !== "object") return base;

  for (const role of ["student", "teacher"]) {
    if (!raw[role] || typeof raw[role] !== "object") continue;
    for (const key of SECTION_KEYS[role]) {
      if (typeof raw[role][key] === "boolean") {
        base[role][key] = raw[role][key];
      }
    }
    if (raw[role].items && typeof raw[role].items === "object") {
      const items = {};
      for (const [k, v] of Object.entries(raw[role].items)) {
        if (typeof k !== "string" || k.length > 200) continue;
        const entry = sanitizeItemEntry(v);
        if (entry !== undefined) items[k] = entry;
      }
      base[role].items = items;
    }
    base[role].itemOrder = sanitizeItemOrder(raw[role].itemOrder);
  }
  return base;
};

export const sanitizeGoalDisplay = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  return mergeGoalDisplay(raw);
};

export const isItemEnabled = (items, id) => {
  if (!items || !Object.prototype.hasOwnProperty.call(items, id)) return true;
  const v = items[id];
  if (typeof v === "boolean") return v;
  if (v && typeof v === "object") return v.enabled !== false;
  return true;
};
