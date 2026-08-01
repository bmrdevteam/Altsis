export type TGoalItemPref = {
  enabled: boolean;
  /** 목표 분모 — 있으면 fill bar (current/target)로 표시 */
  target?: number | null;
};

/** 레거시 boolean 또는 { enabled, target } */
export type TGoalDisplayItemValue = boolean | TGoalItemPref;

export type TGoalDisplayItems = Record<string, TGoalDisplayItemValue>;

export type TGoalDisplayStudent = {
  enrolled: boolean;
  archive: boolean;
  board: boolean;
  items: TGoalDisplayItems;
  /** 켜진 항목의 사이드바 표시 순서 */
  itemOrder: string[];
};

export type TGoalDisplayTeacher = {
  enrolled: boolean;
  created: boolean;
  mentoring: boolean;
  archive: boolean;
  board: boolean;
  items: TGoalDisplayItems;
  /** 켜진 항목의 사이드바 표시 순서 */
  itemOrder: string[];
};

export type TGoalDisplay = {
  student: TGoalDisplayStudent;
  teacher: TGoalDisplayTeacher;
};

export type TGoalArchiveCount = {
  label: string;
  count: number;
  dataType?: "array" | "object";
};

export type TGoalBoardFormProgress = {
  formId: string;
  boardId?: string;
  title: string;
  submitted: number;
  required: number;
};

export type TGoalBoardProgress = {
  /** 이미 한 일(제출 완료 양식 수) */
  submitted: number;
  /** 총 해야 할 일(필수 양식 수) */
  total: number;
  forms: TGoalBoardFormProgress[];
};

export type TGoalsMe = {
  role: "student" | "teacher" | string;
  display: Partial<TGoalDisplayStudent & TGoalDisplayTeacher> & {
    items?: TGoalDisplayItems;
    itemOrder?: string[];
  };
  archive?: TGoalArchiveCount[];
  board?: TGoalBoardProgress;
};

export const DEFAULT_GOAL_DISPLAY: TGoalDisplay = {
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

export function normalizeGoalItemPref(
  raw: TGoalDisplayItemValue | undefined | null
): TGoalItemPref {
  if (raw == null) return { enabled: true };
  if (typeof raw === "boolean") return { enabled: raw };
  if (typeof raw === "object") {
    const enabled = raw.enabled !== false;
    let target: number | null | undefined = raw.target;
    if (target != null) {
      const n = Number(target);
      target = Number.isFinite(n) && n > 0 ? n : null;
    }
    return { enabled, target: target ?? null };
  }
  return { enabled: true };
}

export function isGoalItemPrefEnabled(
  items: TGoalDisplayItems | undefined,
  id: string
): boolean {
  if (!items || !Object.prototype.hasOwnProperty.call(items, id)) {
    return true;
  }
  return normalizeGoalItemPref(items[id]).enabled;
}

export function getGoalItemTarget(
  items: TGoalDisplayItems | undefined,
  id: string
): number | undefined {
  if (!items || !Object.prototype.hasOwnProperty.call(items, id)) {
    return undefined;
  }
  const t = normalizeGoalItemPref(items[id]).target;
  return t != null && t > 0 ? t : undefined;
}

function sanitizeItemEntry(
  v: unknown
): TGoalDisplayItemValue | undefined {
  if (typeof v === "boolean") return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const pref: TGoalItemPref = {
      enabled: o.enabled !== false,
    };
    if (o.target != null && o.target !== "") {
      const n = Number(o.target);
      if (Number.isFinite(n) && n > 0) {
        pref.target = Math.min(Math.floor(n), 1_000_000);
      } else {
        pref.target = null;
      }
    } else {
      pref.target = null;
    }
    return pref;
  }
  return undefined;
}

function sanitizeItemOrder(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const order: string[] = [];
  for (const id of raw) {
    if (typeof id !== "string" || id.length === 0 || id.length > 200) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
  }
  return order;
}

export function mergeGoalDisplay(
  raw?: Partial<TGoalDisplay> | null
): TGoalDisplay {
  const base: TGoalDisplay = JSON.parse(JSON.stringify(DEFAULT_GOAL_DISPLAY));
  if (!raw) return base;

  for (const role of ["student", "teacher"] as const) {
    const src = raw[role] as any;
    if (!src) continue;
    for (const key of Object.keys(base[role])) {
      if (key === "items" || key === "itemOrder") continue;
      if (typeof src[key] === "boolean") {
        (base[role] as any)[key] = src[key];
      }
    }
    if (src.items && typeof src.items === "object") {
      const items: TGoalDisplayItems = {};
      for (const [k, v] of Object.entries(src.items)) {
        if (typeof k !== "string" || k.length > 200) continue;
        const entry = sanitizeItemEntry(v);
        if (entry !== undefined) items[k] = entry;
      }
      base[role].items = items;
    }
    base[role].itemOrder = sanitizeItemOrder(src.itemOrder);
  }
  return base;
}
