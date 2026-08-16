import { TMyAiUsage } from "types/dashboard";
import { formatAlt } from "pages/admin/schools/tab/dashboardFormat";
import { getUsageMeter } from "utils/aiUsageMeter";
import style from "./AiUsageBar.module.scss";

type Props = {
  usage: TMyAiUsage | null;
};

const AiUsageBar = ({ usage }: Props) => {
  if (!usage) return null;
  const meter = getUsageMeter(usage);
  return (
    <div
      className={[
        style.usageBar,
        meter.exceeded
          ? style.usageBarExceeded
          : meter.warn
            ? style.usageBarWarn
            : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
      role="status"
    >
      <div className={style.usageBarMeta}>
        <span className={style.usageBarLabel}>오늘</span>
        <span className={style.usageBarValue}>
          {meter.limit != null
            ? `${formatAlt(meter.used)} / ${formatAlt(meter.limit)} Alt`
            : `${formatAlt(meter.used)} Alt`}
        </span>
        {meter.exceeded && (
          <span className={style.usageBarHint}>한도 초과</span>
        )}
      </div>
      {meter.ratio != null && (
        <div
          className={style.usageTrack}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(meter.ratio * 100)}
          aria-label="오늘 AI Alt 사용률"
        >
          <div
            className={style.usageFill}
            style={{
              width: `${Math.max(
                meter.ratio * 100,
                meter.used > 0 ? 2 : 0
              )}%`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default AiUsageBar;
