/**
 * CalendarEventAPI namespace
 * @namespace APIs.CalendarEventAPI
 * @see TCalendarEvent in {@link Models.CalendarEvent}
 */

import { logger } from "../log/logger.js";
import { CalendarEvent, Enrollment, Syllabus, Registration } from "../models/index.js";
import {
  FIELD_REQUIRED,
  FIELD_INVALID,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

const DAY_MAP = { "일": 0, "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6 };

/**
 * @memberof APIs.CalendarEventAPI
 * @function CCalendarEvent API
 * @description 캘린더 일정 생성 API
 * @version 1.0.0
 */
export const create = async (req, res) => {
  try {
    for (let field of ["title", "start", "end", "scope"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    if (!["school", "personal"].includes(req.body.scope)) {
      return res.status(400).send({ message: FIELD_INVALID("scope") });
    }

    // school scope requires admin or manager
    if (req.body.scope === "school") {
      if (req.user.auth !== "admin" && req.user.auth !== "manager") {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
    }

    const eventData = {
      title: req.body.title,
      description: req.body.description || "",
      start: new Date(req.body.start),
      end: new Date(req.body.end),
      isAllDay: req.body.isAllDay || false,
      scope: req.body.scope,
      user: req.user._id,
      color: req.body.color || "#4285f4",
      calendarId: req.body.calendarId || undefined,
    };

    if (req.body.scope === "school") {
      if (!req.body.school) {
        return res.status(400).send({ message: FIELD_REQUIRED("school") });
      }
      eventData.school = req.body.school;
    }

    if (req.body.recurrence) {
      eventData.recurrence = {
        type: req.body.recurrence.type || "none",
        endDate: req.body.recurrence.endDate
          ? new Date(req.body.recurrence.endDate)
          : undefined,
        days: req.body.recurrence.days || [],
      };
    }

    const calendarEvent = await CalendarEvent(req.user.academyId).create(
      eventData
    );

    return res.status(200).send({ calendarEvent });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.CalendarEventAPI
 * @function RCalendarEvents API
 * @description 캘린더 일정 조회 API (반복 일정 확장 포함)
 * @version 1.0.0
 */
export const find = async (req, res) => {
  try {
    const { startDate, endDate, scope, school, user: userId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).send({ message: FIELD_REQUIRED("startDate") });
    }

    const queryStart = new Date(startDate);
    const queryEnd = new Date(endDate);

    const query = {
      $or: [
        // Non-recurring events within range
        {
          "recurrence.type": "none",
          start: { $lte: queryEnd },
          end: { $gte: queryStart },
        },
        // Recurring events that started before query end
        {
          "recurrence.type": { $ne: "none" },
          start: { $lte: queryEnd },
          $or: [
            { "recurrence.endDate": { $gte: queryStart } },
            { "recurrence.endDate": { $exists: false } },
            { "recurrence.endDate": null },
          ],
        },
      ],
    };

    if (scope) {
      query.scope = scope;
    }
    if (school) {
      query.school = school;
    }

    // For personal scope, show only user's own events + school events
    if (!scope) {
      const targetUser = userId || req.user._id;
      query.$and = [
        {
          $or: [
            { scope: "school" },
            { scope: "personal", user: targetUser },
          ],
        },
      ];
    } else if (scope === "personal" && !userId) {
      query.user = req.user._id;
    }

    const events = await CalendarEvent(req.user.academyId).find(query).lean();

    // Expand recurring events
    const expandedEvents = [];
    for (const event of events) {
      if (event.recurrence?.type === "none" || !event.recurrence?.type) {
        expandedEvents.push(event);
      } else {
        const instances = expandRecurringEvent(event, queryStart, queryEnd);
        expandedEvents.push(...instances);
      }
    }

    return res.status(200).send({ calendarEvents: expandedEvents });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.CalendarEventAPI
 * @function UCalendarEvent API
 * @description 캘린더 일정 수정 API
 * @version 1.0.0
 */
export const update = async (req, res) => {
  try {
    const event = await CalendarEvent(req.user.academyId).findById(
      req.params._id
    );
    if (!event) {
      return res.status(404).send({ message: __NOT_FOUND("calendarEvent") });
    }

    // Permission check
    if (event.scope === "school") {
      if (req.user.auth !== "admin" && req.user.auth !== "manager") {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
    } else if (String(event.user) !== String(req.user._id)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const allowedFields = [
      "title",
      "description",
      "start",
      "end",
      "isAllDay",
      "recurrence",
      "color",
      "calendarId",
    ];
    for (const field of allowedFields) {
      if (field in req.body) {
        if (field === "start" || field === "end") {
          event[field] = new Date(req.body[field]);
        } else if (field === "recurrence") {
          event.recurrence = {
            type: req.body.recurrence.type || "none",
            endDate: req.body.recurrence.endDate
              ? new Date(req.body.recurrence.endDate)
              : undefined,
            days: req.body.recurrence.days || [],
          };
        } else {
          event[field] = req.body[field];
        }
      }
    }

    await event.save();
    return res.status(200).send({ calendarEvent: event });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.CalendarEventAPI
 * @function DCalendarEvent API
 * @description 캘린더 일정 삭제 API
 * @version 1.0.0
 */
export const remove = async (req, res) => {
  try {
    const event = await CalendarEvent(req.user.academyId).findById(
      req.params._id
    );
    if (!event) {
      return res.status(404).send({ message: __NOT_FOUND("calendarEvent") });
    }

    // Permission check
    if (event.scope === "school") {
      if (req.user.auth !== "admin" && req.user.auth !== "manager") {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
    } else if (String(event.user) !== String(req.user._id)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    await event.deleteOne();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.CalendarEventAPI
 * @function SyncEnrollments API
 * @description 수강/멘토링 일정을 매주 반복 캘린더 일정으로 동기화
 * @version 1.0.0
 */
export const syncEnrollments = async (req, res) => {
  try {
    const { season, targetUser } = req.body;
    if (!season) {
      return res.status(400).send({ message: FIELD_REQUIRED("season") });
    }

    // Allow admin/teacher/manager to sync for another user
    let syncUserId = req.user._id;
    if (targetUser && String(targetUser) !== String(req.user._id)) {
      if (!["admin", "manager", "teacher"].includes(req.user.auth)) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
      syncUserId = targetUser;
    }

    const registration = await Registration(req.user.academyId).findOne({
      season,
      user: syncUserId,
    });
    if (!registration || !registration.period) {
      return res.status(404).send({ message: __NOT_FOUND("registration") });
    }

    const periodStart = new Date(registration.period.start);
    const periodEnd = new Date(registration.period.end);

    const eventsToCreate = [];

    // 1. Student enrollments
    const enrollments = await Enrollment(req.user.academyId)
      .find({ season, student: syncUserId })
      .select("-evaluation")
      .lean();

    for (const enrollment of enrollments) {
      if (enrollment.isHiddenFromCalendar) continue;
      if (!enrollment.time || enrollment.time.length === 0) continue;

      for (let idx = 0; idx < enrollment.time.length; idx++) {
        const timeBlock = enrollment.time[idx];
        const sourceId = `enrollment_${enrollment._id}_${idx}`;

        const firstDate = getFirstOccurrence(periodStart, DAY_MAP[timeBlock.day]);
        if (!firstDate || firstDate > periodEnd) continue;

        const [startH, startM] = timeBlock.start.split(":").map(Number);
        const [endH, endM] = timeBlock.end.split(":").map(Number);

        const start = new Date(firstDate);
        start.setHours(startH, startM, 0, 0);
        const end = new Date(firstDate);
        end.setHours(endH, endM, 0, 0);

        eventsToCreate.push({
          sourceType: "enrollment",
          sourceId,
          syllabusId: enrollment.syllabus,
          title: enrollment.classTitle,
          description: enrollment.classroom ? `강의실: ${enrollment.classroom}` : "",
          start,
          end,
          isAllDay: false,
          scope: "personal",
          user: syncUserId,
          recurrence: { type: "weekly", endDate: periodEnd },
          color: "#4285f4",
        });
      }
    }

    // 2. Teacher syllabuses (mentoring)
    if (registration.role === "teacher") {
      const syllabuses = await Syllabus(req.user.academyId)
        .find({ season })
        .lean();

      for (const syllabus of syllabuses) {
        const teacherEntry = syllabus.teachers?.find(
          (t) => String(t._id) === String(syncUserId)
        );
        if (!teacherEntry) continue;
        if (teacherEntry.isHiddenFromCalendar) continue;
        if (!syllabus.time || syllabus.time.length === 0) continue;

        for (let idx = 0; idx < syllabus.time.length; idx++) {
          const timeBlock = syllabus.time[idx];
          const sourceId = `syllabus_${syllabus._id}_${idx}`;

          const firstDate = getFirstOccurrence(periodStart, DAY_MAP[timeBlock.day]);
          if (!firstDate || firstDate > periodEnd) continue;

          const [startH, startM] = timeBlock.start.split(":").map(Number);
          const [endH, endM] = timeBlock.end.split(":").map(Number);

          const start = new Date(firstDate);
          start.setHours(startH, startM, 0, 0);
          const end = new Date(firstDate);
          end.setHours(endH, endM, 0, 0);

          eventsToCreate.push({
            sourceType: "syllabus",
            sourceId,
            title: syllabus.classTitle,
            description: syllabus.classroom ? `강의실: ${syllabus.classroom}` : "",
            start,
            end,
            isAllDay: false,
            scope: "personal",
            user: syncUserId,
            recurrence: { type: "weekly", endDate: periodEnd },
            color: "#34a853",
          });
        }
      }
    }

    // 3. Memos
    if (registration.memos && registration.memos.length > 0) {
      for (const memo of registration.memos) {
        if (!memo.day || !memo.start || !memo.end) continue;

        const sourceId = `memo_${registration._id}_${memo._id}`;
        const firstDate = getFirstOccurrence(periodStart, DAY_MAP[memo.day]);
        if (!firstDate || firstDate > periodEnd) continue;

        const [startH, startM] = memo.start.split(":").map(Number);
        const [endH, endM] = memo.end.split(":").map(Number);

        const start = new Date(firstDate);
        start.setHours(startH, startM, 0, 0);
        const end = new Date(firstDate);
        end.setHours(endH, endM, 0, 0);

        eventsToCreate.push({
          sourceType: "memo",
          sourceId,
          title: memo.title || "메모",
          description: memo.memo || "",
          start,
          end,
          isAllDay: false,
          scope: "personal",
          user: syncUserId,
          recurrence: { type: "weekly", endDate: periodEnd },
          color: "#ff9800",
        });
      }
    }

    // Upsert: skip events that already exist (by sourceId)
    let created = 0;
    const currentSourceIds = new Set(eventsToCreate.map((e) => e.sourceId));

    for (const eventData of eventsToCreate) {
      if (eventData.sourceType === "memo") {
        // For memos, only create if not exists; don't overwrite user edits
        const result = await CalendarEvent(req.user.academyId).updateOne(
          {
            user: syncUserId,
            sourceType: eventData.sourceType,
            sourceId: eventData.sourceId,
          },
          { $setOnInsert: eventData },
          { upsert: true }
        );
        if (result.upsertedCount > 0) created++;
      } else {
        const result = await CalendarEvent(req.user.academyId).updateOne(
          {
            user: syncUserId,
            sourceType: eventData.sourceType,
            sourceId: eventData.sourceId,
          },
          { $set: eventData },
          { upsert: true }
        );
        if (result.upsertedCount > 0) created++;
      }
    }

    // 삭제된 enrollment/syllabus의 고아 이벤트 정리 및 중복 제거
    const existingEvents = await CalendarEvent(req.user.academyId)
      .find({
        user: syncUserId,
        sourceType: { $in: ["enrollment", "syllabus", "memo"] },
      })
      .sort({ updatedAt: -1 }); // 최근 수정된 항목을 먼저 처리

    let removed = 0;
    const processedSourceIds = new Set();

    for (const event of existingEvents) {
      // 1. 소스 ID가 더 이상 유효하지 않거나(고아), 2. 이미 처리된 소스 ID인 경우(중복) 삭제
      if (
        !currentSourceIds.has(event.sourceId) ||
        processedSourceIds.has(event.sourceId)
      ) {
        await event.deleteOne();
        removed++;
        continue;
      }

      processedSourceIds.add(event.sourceId);
    }

    return res.status(200).send({ synced: created, removed, total: eventsToCreate.length });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * Find the first occurrence of a given day of week on or after a start date
 * @param {Date} startDate
 * @param {number} targetDay - 0=Sunday, 1=Monday, ...
 * @returns {Date}
 */
function getFirstOccurrence(startDate, targetDay) {
  if (targetDay === undefined || targetDay === null) return null;
  const date = new Date(startDate);
  const currentDay = date.getDay();
  const diff = (targetDay - currentDay + 7) % 7;
  date.setDate(date.getDate() + diff);
  return date;
}

/**
 * Expand a recurring event into individual instances within a date range
 */
function expandRecurringEvent(event, queryStart, queryEnd) {
  const instances = [];
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  const duration = eventEnd.getTime() - eventStart.getTime();
  const recurrenceEnd = event.recurrence.endDate
    ? new Date(event.recurrence.endDate)
    : queryEnd;

  const effectiveEnd = recurrenceEnd < queryEnd ? recurrenceEnd : queryEnd;

  // Weekly with specific days: iterate day-by-day, only emit on matching days
  if (event.recurrence.type === "weekly" && event.recurrence.days?.length > 0) {
    const days = new Set(event.recurrence.days);
    let current = new Date(eventStart);

    // Skip ahead to query window for performance
    if (queryStart > current) {
      current = new Date(queryStart);
      current.setDate(current.getDate() - current.getDay());
    }

    while (current <= effectiveEnd) {
      if (days.has(current.getDay()) && current >= eventStart) {
        const instanceStart = new Date(current);
        instanceStart.setHours(
          eventStart.getHours(),
          eventStart.getMinutes(),
          eventStart.getSeconds(),
          eventStart.getMilliseconds()
        );
        const instanceEnd = new Date(instanceStart.getTime() + duration);

        if (instanceEnd >= queryStart && instanceStart <= queryEnd) {
          instances.push({
            ...event,
            _id: event._id,
            recurrenceParentId: event._id,
            start: instanceStart,
            end: instanceEnd,
            isRecurrenceInstance: true,
          });
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return instances;
  }

  // Default logic for daily, monthly, and weekly without specific days
  let current = new Date(eventStart);

  while (current <= effectiveEnd) {
    const instanceEnd = new Date(current.getTime() + duration);

    if (instanceEnd >= queryStart && current <= queryEnd) {
      instances.push({
        ...event,
        _id: event._id,
        recurrenceParentId: event._id,
        start: new Date(current),
        end: new Date(instanceEnd),
        isRecurrenceInstance: true,
      });
    }

    // Advance to next occurrence
    switch (event.recurrence.type) {
      case "daily":
        current.setDate(current.getDate() + 1);
        break;
      case "weekly":
        current.setDate(current.getDate() + 7);
        break;
      case "monthly":
        current.setMonth(current.getMonth() + 1);
        break;
      default:
        return instances;
    }
  }

  return instances;
}
