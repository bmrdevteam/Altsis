/**
 * School-scoped calendar rows in a date range. Personal events stay out.
 */

import { CalendarEvent } from "../../../models/index.js";

const MAX_EVENTS = 40;

const advance = (date, type) => {
  const next = new Date(date.getTime());
  if (type === "daily") next.setUTCDate(next.getUTCDate() + 1);
  else if (type === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else if (type === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  else return null;
  return next;
};

/** Non-recurring rows pass through. Recurring rows expand inside the range, capped. */
export const expandSchoolEvent = (event, queryStart, queryEnd) => {
  const start = new Date(event?.start);
  const end = new Date(event?.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const type = event?.recurrence?.type;
  if (!type || type === "none") {
    if (end >= queryStart && start <= queryEnd) return [{ ...event, start, end }];
    return [];
  }
  const duration = Math.max(0, end.getTime() - start.getTime());
  const recurrenceEnd = event.recurrence?.endDate ? new Date(event.recurrence.endDate) : null;
  const until = recurrenceEnd && recurrenceEnd < queryEnd ? recurrenceEnd : queryEnd;
  const instances = [];
  let cursor = new Date(start);
  let guard = 0;
  while (cursor <= until && instances.length < MAX_EVENTS && guard < 400) {
    guard += 1;
    const instanceEnd = new Date(cursor.getTime() + duration);
    if (instanceEnd >= queryStart && cursor <= queryEnd) {
      instances.push({ ...event, start: new Date(cursor), end: instanceEnd });
    }
    const next = advance(cursor, type);
    if (!next || next.getTime() <= cursor.getTime()) break;
    cursor = next;
  }
  return instances;
};

export const listSchoolCalendarEvents = async (academyId, schoolId, queryStart, queryEnd) => {
  if (!academyId || !schoolId) return [];
  const events = await CalendarEvent(academyId)
    .find({
      scope: "school",
      school: schoolId,
      dismissed: { $ne: true },
      $or: [
        {
          $or: [{ "recurrence.type": "none" }, { "recurrence.type": { $exists: false } }],
          start: { $lte: queryEnd },
          end: { $gte: queryStart },
        },
        {
          "recurrence.type": { $nin: ["none", null] },
          start: { $lte: queryEnd },
          "recurrence.endDate": { $gte: queryStart },
        },
        {
          "recurrence.type": { $nin: ["none", null] },
          start: { $lte: queryEnd },
          "recurrence.endDate": null,
        },
      ],
    })
    .limit(80)
    .lean();
  const expanded = [];
  for (const event of events || []) {
    expanded.push(...expandSchoolEvent(event, queryStart, queryEnd));
    if (expanded.length >= MAX_EVENTS) break;
  }
  return expanded.slice(0, MAX_EVENTS);
};
