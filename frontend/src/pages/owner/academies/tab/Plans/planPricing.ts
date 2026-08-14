export const SEAT_UNIT = 100;
export const SEAT_UNIT_PRICE = 30_000;
export const GIB_BYTES = 1024 * 1024 * 1024;
export const STORAGE_UNIT_BYTES = 100 * GIB_BYTES;
export const STORAGE_UNIT_PRICE = 10_000;
export const TOKEN_UNIT = 100_000_000;
export const TOKEN_UNIT_PRICE = 10_000;
/** 1 Alt = 10,000 tokens. Billing unit (1억 tokens) = 10,000 Alt. */
export const TOKENS_PER_ALT = 10_000;
export const TOKEN_UNIT_ALTS = TOKEN_UNIT / TOKENS_PER_ALT;
export const MAX_UNIT_PRICE = 1_000_000_000;

export const formatKrw = (n: number) =>
  `${Math.max(0, Math.round(n)).toLocaleString("ko-KR")}원`;

export const tokensToAlts = (tokens: number) => {
  const n = Math.max(0, Number(tokens) || 0);
  return Math.round((n / TOKENS_PER_ALT) * 1e6) / 1e6;
};

export const altsToTokens = (alts: number) =>
  Math.max(0, Math.floor(Number(alts) || 0)) * TOKENS_PER_ALT;

/** Whole Alt for the limit stepper. Never understates a stored token cap. */
export const tokensToAltLimit = (tokens: number | null) => {
  if (tokens == null) return null;
  const alts = Math.ceil(Math.max(0, Number(tokens) || 0) / TOKENS_PER_ALT);
  return alts <= 0 ? null : alts;
};

export const formatAltCount = (alts: number) => {
  if (!Number.isFinite(alts) || alts === 0) return "0";
  if (alts >= 100) {
    return alts.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  }
  if (alts >= 10) {
    return alts.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
  }
  return alts.toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
};

export const seatUnits = (limit: number | null) =>
  limit == null ? 0 : Math.ceil(Math.max(0, limit) / SEAT_UNIT);

export const storageUnits = (bytes: number | null) =>
  bytes == null ? 0 : Math.ceil(Math.max(0, bytes) / STORAGE_UNIT_BYTES);

export const tokenUnits = (tokens: number | null) =>
  tokens == null ? 0 : Math.ceil(Math.max(0, tokens) / TOKEN_UNIT);

export const bytesToGiB = (bytes: number) =>
  Math.max(0, Math.round(Math.max(0, bytes) / GIB_BYTES));

export const giBToBytes = (gib: number) =>
  Math.max(0, Math.floor(gib)) * GIB_BYTES;

export const priceForLimit = (
  limit: number | null,
  unit: number,
  unitPrice: number
) => {
  if (limit == null || limit <= 0) return 0;
  const units = Math.ceil(Math.max(0, limit) / unit);
  return units * Math.max(0, Math.floor(unitPrice) || 0);
};

export const clampUnitPrice = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(MAX_UNIT_PRICE, Math.floor(value)));
};

/** 한도 대비 사용량 막대 색. 70% 이하 초록, 80% 미만 노랑, 80% 이상 빨강 */
export const usageBarTone = (
  ratio: number
): "ok" | "caution" | "danger" => {
  if (ratio <= 0.7) return "ok";
  if (ratio < 0.8) return "caution";
  return "danger";
};
