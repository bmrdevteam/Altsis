import { z } from "zod";
import { buildScheduleFields } from "../../../services/alterScheduleTime.js";
import { defineTool } from "../defineTool.js";
import { clip } from "../lib/compact.js";

const filters = z.object({
  boardIds: z.array(z.string()).optional(),
  formIds: z.array(z.string()).optional(),
  senderUserIds: z.array(z.string()).optional(),
  calendarScope: z.string().optional(),
});

const event = z.object({
  types: z.array(z.string()).optional(),
  debounceMs: z.number().int().optional(),
  dmOptIn: z.boolean().optional(),
  filters: filters.optional(),
});

const schedule = z.object({
  kind: z.enum(["once", "daily", "weekly"]).optional(),
  time: z.string().optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  onceAt: z.string().optional(),
});

const input = z.object({
  action: z.enum(["list", "propose_create", "propose_delete"]),
  title: z.string().optional(),
  prompt: z.string().optional(),
  scheduleId: z.string().optional(),
  timezone: z.string().optional(),
  trigger: z.enum(["time", "event"]).optional(),
  event: event.optional(),
  schedule: schedule.optional(),
});

export default defineTool({
  name: "manage_schedule",
  label: "예약",
  description: "예약 실행을 제안만 합니다. 저장은 사용자가 합니다. prompt는 조회와 안내만.",
  input,
  permission: { roles: ["teacher"], access: "self" },
  readOnly: true,
  untrustedOutput: false,
  promptHints: [
    "manage_schedule은 저장하지 않습니다. prompt에는 조회와 안내만 넣으세요. 쓰기 요청은 거절하고, 매일 9시에 채점할 항목이 있는지 정리처럼 조회 예약을 대신 제안하세요.",
  ],
  include: (deps) => deps.includeScheduleTool !== false,
  async handler(ctx, rawArgs = {}) {
    const action = String(rawArgs.action || "").trim();
    if (action === "list") {
      const list =
        ctx.deps?.listSchedules ||
        (await import("../../../services/alterScheduleService.js")).listSchedulesForTool;
      return list(ctx);
    }
    if (action === "propose_delete") {
      const scheduleId = clip(rawArgs.scheduleId, 64);
      if (!scheduleId) {
        return { summary: "예약 id 없음", saved: false, error: "scheduleId가 필요합니다." };
      }
      return {
        summary: "삭제 제안입니다. 저장은 사용자가 합니다.",
        saved: false,
        proposal: { saved: false, action: "delete", scheduleId },
      };
    }
    if (action !== "propose_create") {
      return {
        summary: "알 수 없는 동작",
        saved: false,
        error: "action은 list, propose_create, propose_delete 입니다.",
      };
    }
    try {
      const fields = buildScheduleFields({
        title: rawArgs.title,
        prompt: rawArgs.prompt,
        timezone: rawArgs.timezone,
        trigger: rawArgs.trigger,
        event: rawArgs.event,
        schedule: rawArgs.schedule,
      });
      return {
        summary: "예약 제안입니다. 저장은 사용자가 합니다.",
        saved: false,
        proposal: {
          saved: false,
          action: "create",
          title: fields.title,
          prompt: fields.prompt,
          trigger: fields.trigger || "time",
          ...(fields.event ? { event: fields.event } : {}),
          ...(fields.schedule
            ? {
                schedule: {
                  ...fields.schedule,
                  onceAt: fields.schedule.onceAt
                    ? new Date(fields.schedule.onceAt).toISOString()
                    : undefined,
                },
              }
            : {}),
          timezone: fields.timezone,
          nextRunAt: fields.nextRunAt ? fields.nextRunAt.toISOString() : null,
        },
      };
    } catch (err) {
      return {
        summary: err.message || "예약을 제안하지 못했습니다.",
        saved: false,
        error: err.message,
      };
    }
  },
});
