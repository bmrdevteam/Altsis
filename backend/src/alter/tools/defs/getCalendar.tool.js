/**
 * School calendar events in a date range. Not personal calendars.
 */

import { z } from "zod";
import { logger } from "../../../log/logger.js";
import { defineTool } from "../defineTool.js";
import { clip, compact, iso } from "../lib/compact.js";
import { gateTeacher } from "../lib/readGate.js";
import { listSchoolCalendarEvents } from "../lib/schoolCalendar.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SPAN_MS = 92 * DAY_MS;

const parseDate = (value) => {
  const text = String(value || "").trim();
  if (!text || text.length > 40) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const project = (event) =>
  compact({
    title: clip(event?.title, 80),
    start: iso(event?.start),
    end: iso(event?.end),
    allDay: event?.isAllDay === true ? true : undefined,
  });

export default defineTool({
  name: "get_calendar",
  label: "학교 일정",
  description: "이 학교의 학교 일정을 기간으로 읽습니다. 개인 일정은 포함하지 않습니다.",
  input: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .strict(),
  permission: { roles: ["teacher"], access: "self" },
  readOnly: true,
  untrustedOutput: true,
  promptHints: [
    "학교 일정은 get_calendar입니다. start와 end로 기간을 주세요. 92일을 넘기지 마세요.",
    "개인 일정과 다른 학교 일정은 이 도구에 없습니다. 없는 행사는 만들지 마세요.",
  ],
  async handler(ctx, rawArgs = {}) {
    const gate = await gateTeacher(ctx);
    if (!gate.ok) return { ...gate.error, events: [] };
    const start = parseDate(rawArgs.start);
    const end = parseDate(rawArgs.end);
    if (!start || !end || end < start) {
      return { summary: "날짜가 올바르지 않습니다.", error: "날짜가 올바르지 않습니다.", events: [] };
    }
    if (end.getTime() - start.getTime() > MAX_SPAN_MS) {
      return {
        summary: "기간은 92일 이내여야 합니다.",
        error: "기간은 92일 이내여야 합니다.",
        events: [],
      };
    }
    const schoolId = ctx.school?._id;
    if (!ctx.academyId || !schoolId) {
      return { summary: "학교 정보가 없습니다.", error: "학교 정보가 없습니다.", events: [] };
    }
    try {
      const load = ctx.listSchoolEvents || listSchoolCalendarEvents;
      const events = await load(ctx.academyId, schoolId, start, end);
      const items = (events || []).map(project);
      return {
        summary: items.length ? `학교 일정 ${items.length}건` : "학교 일정 없음",
        count: items.length,
        events: items,
      };
    } catch (err) {
      logger.error(`alter get_calendar: ${err.message}`);
      return { summary: "일정을 불러오지 못했습니다.", error: "일정을 불러오지 못했습니다.", events: [] };
    }
  },
});
