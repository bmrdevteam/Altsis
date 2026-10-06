export type TAlterScheduleSpec = {
  kind?: string;
  time?: string;
  weekdays?: number[];
  onceAt?: string;
};

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

export const describeAlterSchedule = (
  schedule?: TAlterScheduleSpec | null,
  timezone?: string
) => {
  if (!schedule?.kind) return "시각 없음";
  const zone = timezone || "Asia/Seoul";
  if (schedule.kind === "daily") return `매일 ${schedule.time || ""} (${zone})`;
  if (schedule.kind === "weekly") {
    const days = (schedule.weekdays || [])
      .map((day) => WEEKDAY[day] || "")
      .filter(Boolean)
      .join(", ");
    return `매주 ${days} ${schedule.time || ""} (${zone})`;
  }
  if (schedule.kind === "once") {
    const at = schedule.onceAt ? new Date(schedule.onceAt) : null;
    const label =
      at && !Number.isNaN(at.getTime())
        ? at.toLocaleString("ko-KR", { timeZone: zone })
        : "시각 미정";
    return `한 번 ${label} (${zone})`;
  }
  return "시각 없음";
};

export const alterScheduleStatusLabel = (status?: string) => {
  if (status === "ok") return "완료";
  if (status === "skipped") return "건너뜀";
  if (status === "error") return "실패";
  if (status === "running") return "실행 중";
  return "아직 없음";
};
