import { TMyAiUsage } from "types/dashboard";

export type TAiUsageMeter = {
  used: number;
  limit: number | null;
  ratio: number | null;
  exceeded: boolean;
  warn: boolean;
};

export const getUsageMeter = (usage: TMyAiUsage): TAiUsageMeter => {
  const used = usage.usedAlts ?? 0;
  const limit =
    usage.limitEnabled && usage.limitAlts != null && usage.limitAlts > 0
      ? usage.limitAlts
      : null;
  const ratio = limit != null ? Math.min(1, used / limit) : null;
  const exceeded = limit != null && used >= limit;
  const warn = !exceeded && ratio != null && ratio >= 0.8;
  return { used, limit, ratio, exceeded, warn };
};
