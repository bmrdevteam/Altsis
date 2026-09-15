export const DEFAULT_LINE_HEIGHT = 1.45;
export const LINE_HEIGHT_MIN = 1;
export const LINE_HEIGHT_MAX = 3;
export const LINE_HEIGHT_PRESETS = [1, 1.15, 1.45, 1.8, 2] as const;

/** unitless 1–3만 허용. 비정상이면 null. */
export const clampLineHeight = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < LINE_HEIGHT_MIN || n > LINE_HEIGHT_MAX) return null;
  return Math.round(n * 100) / 100;
};

export const formatLineHeight = (value: unknown): string | null => {
  const n = clampLineHeight(value);
  if (n == null) return null;
  return String(n);
};

/** style.lineHeight에서 배수만 읽는다. */
export const parseLineHeight = (raw: unknown): number | null => {
  const text = String(raw || "").trim();
  if (!text) return null;
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  return clampLineHeight(Number(text));
};
