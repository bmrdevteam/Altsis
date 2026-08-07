import { TDashboardDelta } from "types/dashboard";

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const formatNumber = (n: number): string => n.toLocaleString();

/** Alt usage display (1 Alt = 10,000 tokens) */
export const formatAlt = (n: number): string => {
  if (!Number.isFinite(n) || n === 0) return "0";
  if (n >= 100) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 10) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return n.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
};

export const tokensToAlts = (tokens: number, tokensPerAlt = 10000): number => {
  const n = Math.max(0, Number(tokens) || 0);
  const per = tokensPerAlt > 0 ? tokensPerAlt : 10000;
  return Math.round((n / per) * 1e6) / 1e6;
};

export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export type DeltaTone = "up" | "down" | "flat" | "none";

export const getDeltaTone = (
  delta: TDashboardDelta | undefined,
  invert = false
): DeltaTone => {
  if (!delta || delta.absolute === null) return "none";
  if (delta.absolute === 0) return "flat";
  const positiveIsGood = !invert;
  if (delta.absolute > 0) return positiveIsGood ? "up" : "down";
  return positiveIsGood ? "down" : "up";
};

export const formatDeltaPercent = (
  delta: TDashboardDelta | undefined
): string | null => {
  if (!delta || delta.percent === null) return null;
  const sign = delta.percent > 0 ? "+" : "";
  return `${sign}${delta.percent}%`;
};

/** Response-time health for status coloring */
export const responseTimeStatus = (
  ms: number
): "success" | "warning" | "error" => {
  if (ms <= 200) return "success";
  if (ms <= 500) return "warning";
  return "error";
};
