import { TDashboardDelta } from "types/dashboard";

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const formatNumber = (n: number): string => n.toLocaleString();

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
