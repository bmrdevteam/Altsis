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

const EVENT_LABEL: Record<string, string> = {
  approval_requested: "결재 요청",
  form_submitted: "제출",
  form_posted: "양식 게시",
  calendar_created: "일정",
  dm_received: "1:1 메시지",
};

export const describeAlterRoutine = (row?: {
  trigger?: string;
  event?: { types?: string[]; debounceMs?: number };
  schedule?: TAlterScheduleSpec | null;
  timezone?: string;
} | null) => {
  if (row?.trigger === "event") {
    const names = (row.event?.types || [])
      .map((type) => EVENT_LABEL[type] || type)
      .join(", ");
    const minutes = Math.round((row.event?.debounceMs || 15 * 60 * 1000) / 60000);
    return `이벤트 · ${names || "종류 없음"} · ${minutes}분 모아서`;
  }
  return describeAlterSchedule(row?.schedule, row?.timezone);
};

export const alterScheduleStatusLabel = (status?: string) => {
  if (status === "ok") return "완료";
  if (status === "skipped") return "건너뜀";
  if (status === "error") return "실패";
  if (status === "running") return "실행 중";
  return "아직 없음";
};
