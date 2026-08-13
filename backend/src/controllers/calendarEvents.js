/**
 * CalendarEventAPI namespace
 * @namespace APIs.CalendarEventAPI
 * @see TCalendarEvent in {@link Models.CalendarEvent}
 */

import mongoose from "mongoose";
import { logger } from "../log/logger.js";
import { CalendarEvent, Enrollment, Syllabus, Registration } from "../models/index.js";
import {
  FIELD_REQUIRED,
  FIELD_INVALID,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";
import {
  registerEventNotification,
  removeEventNotification,
  registerEventReminder,
  removeEventReminder,
} from "../services/schedulerQueue.js";

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

    if (!req.body.school) {
      return res.status(400).send({ message: FIELD_REQUIRED("school") });
    }
    eventData.school = req.body.school;

    if (req.body.recurrence) {
      eventData.recurrence = {
        type: req.body.recurrence.type || "none",
        endDate: req.body.recurrence.endDate
          ? new Date(req.body.recurrence.endDate)
          : undefined,
        days: req.body.recurrence.days || [],
      };
    }

    if (req.body.reminder) {
      eventData.reminder = {
        enabled: req.body.reminder.enabled ?? false,
        minutesBefore: req.body.reminder.minutesBefore,
        useDefault: req.body.reminder.useDefault ?? true,
      };
    }

    if (req.body.scheduleStart) {
      eventData.scheduleStart = {
        enabled: req.body.scheduleStart.enabled ?? false,
      };
    }

    eventData.notifySchool =
      req.body.scope === "school" && req.body.notifySchool === true;

    const calendarEvent = await CalendarEvent(req.user.academyId).create(
      eventData
    );

    // 스케줄러 큐에 등록 (fire-and-forget; 옵트인 게이트는 register* 내부)
    if (calendarEvent.scheduleStart?.enabled) {
      registerEventNotification(req.user.academyId, calendarEvent).catch((err) =>
        logger.error(`Failed to register event notification: ${err.message}`)
      );
    }
    if (calendarEvent.reminder?.enabled) {
      registerEventReminder(req.user.academyId, calendarEvent).catch((err) =>
        logger.error(`Failed to register event reminder: ${err.message}`)
      );
    }

    return res.status(200).send({ calendarEvent });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
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
      dismissed: { $ne: true },
      $or: [
        // Non-recurring events within range
        {
          "recurrence.type": "none",
          start: { $lte: queryEnd },
          end: { $gte: queryStart },
        },
        // Recurring events with endDate within range
        {
          "recurrence.type": { $ne: "none" },
          start: { $lte: queryEnd },
          "recurrence.endDate": { $gte: queryStart },
        },
        // Recurring events with no endDate (infinite)
        {
          "recurrence.type": { $ne: "none" },
          start: { $lte: queryEnd },
          "recurrence.endDate": null,
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
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
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
      "reminder",
      "scheduleStart",
      "notifySchool",
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
        } else if (field === "reminder") {
          event.reminder = {
            enabled: req.body.reminder.enabled ?? false,
            minutesBefore: req.body.reminder.minutesBefore,
            useDefault: req.body.reminder.useDefault ?? true,
          };
        } else if (field === "scheduleStart") {
          event.scheduleStart = {
            enabled: req.body.scheduleStart.enabled ?? false,
          };
        } else if (field === "notifySchool") {
          event.notifySchool =
            event.scope === "school" && req.body.notifySchool === true;
        } else {
          event[field] = req.body[field];
        }
      }
    }

    // personal 등으로 scope가 바뀌지 않더라도, school이 아니면 강제 OFF
    if (event.scope !== "school") {
      event.notifySchool = false;
    }

    await event.save();

    // 스케줄러 큐 재등록 — 제거를 끝낸 뒤 등록해야 reverse index 레이스 방지
    const academyId = req.user.academyId;
    const eventId = String(event._id);
    try {
      await removeEventNotification(academyId, eventId);
      await removeEventReminder(academyId, eventId);
      if (event.scheduleStart?.enabled) {
        await registerEventNotification(academyId, event);
      }
      if (event.reminder?.enabled) {
        await registerEventReminder(academyId, event);
      }
    } catch (err) {
      logger.error(`Failed to refresh event scheduler queue: ${err.message}`);
    }

    return res.status(200).send({ calendarEvent: event });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
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

    // 스케줄러 큐에서 제거
    const academyId = req.user.academyId;
    const eventId = String(event._id);
    removeEventNotification(academyId, eventId).catch((err) =>
      logger.error(`Failed to remove event notification: ${err.message}`)
    );
    removeEventReminder(academyId, eventId).catch((err) =>
      logger.error(`Failed to remove event reminder: ${err.message}`)
    );

    // 메모 이벤트는 원본 메모도 함께 삭제하여 완전히 제거
    if (event.sourceType === "memo" && event.sourceId) {
      const parts = event.sourceId.split("_");
      // sourceId format: memo_${registrationId}_${memoId}
      if (parts.length >= 3) {
        const registrationId = parts[1];
        const memoId = parts.slice(2).join("_");
        await Registration(req.user.academyId).updateOne(
          { _id: registrationId },
          { $pull: { memos: { _id: memoId } } }
        );
      }
      await event.deleteOne();
    }
    // 다른 동기화된 이벤트는 소프트 삭제 (다음 동기화 시 재생성 방지)
    else if (event.sourceType && event.sourceType !== "manual") {
      event.dismissed = true;
      await event.save();
    } else {
      await event.deleteOne();
    }
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
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

    // 타인 일정 동기화 허용
    let syncUserId = req.user._id;
    if (targetUser && String(targetUser) !== String(req.user._id)) {
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
    const syncSchool = registration.school;

    const eventsToCreate = [];

    // 1. Student enrollments
    const enrollments = await Enrollment(req.user.academyId)
      .find({ season, student: syncUserId })
      .select("_id classTitle time classroom syllabus isHiddenFromCalendar")
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
          school: syncSchool,
          user: syncUserId,
          recurrence: { type: "weekly", endDate: periodEnd },
          color: "#4285f4",
        });
      }
    }

    // 2. Teacher syllabuses (mentoring)
    if (registration.role === "teacher") {
      const syllabuses = await Syllabus(req.user.academyId)
        .find({ season, "teachers._id": syncUserId })
        .select("classTitle time classroom teachers")
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
            school: syncSchool,
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
          school: syncSchool,
          user: syncUserId,
          recurrence: { type: "weekly", endDate: periodEnd },
          color: "#ff9800",
        });
      }
    }

    // Upsert: skip events that already exist (by sourceId)
    let created = 0;
    const currentSourceIds = new Set(eventsToCreate.map((e) => e.sourceId));

    const memoOps = [];
    const otherOps = [];

    for (const eventData of eventsToCreate) {
      const filter = {
        user: syncUserId,
        sourceType: eventData.sourceType,
        sourceId: eventData.sourceId,
      };
      if (eventData.sourceType === "memo") {
        memoOps.push({
          updateOne: { filter, update: { $setOnInsert: eventData }, upsert: true },
        });
      } else {
        otherOps.push({
          updateOne: { filter, update: { $set: eventData }, upsert: true },
        });
      }
    }

    if (otherOps.length > 0) {
      const result = await CalendarEvent(req.user.academyId).bulkWrite(otherOps, { ordered: false });
      created += result.upsertedCount;
    }
    if (memoOps.length > 0) {
      const result = await CalendarEvent(req.user.academyId).bulkWrite(memoOps, { ordered: false });
      created += result.upsertedCount;
    }

    // 삭제된 enrollment/syllabus의 고아 이벤트 정리 및 중복 제거
    const currentSourceIdArray = Array.from(currentSourceIds);

    // 1. 고아 이벤트 일괄 삭제 (sourceId가 더 이상 유효하지 않은 이벤트)
    const deleteResult = await CalendarEvent(req.user.academyId).deleteMany({
      user: syncUserId,
      sourceType: { $in: ["enrollment", "syllabus", "memo"] },
      sourceId: { $nin: currentSourceIdArray },
    });
    let removed = deleteResult.deletedCount;

    // 2. 중복 이벤트 정리 (같은 sourceId가 여러 개인 경우 최신 1개만 유지)
    const duplicates = await CalendarEvent(req.user.academyId).aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(syncUserId),
          sourceType: { $in: ["enrollment", "syllabus", "memo"] },
          sourceId: { $in: currentSourceIdArray },
        },
      },
      { $sort: { updatedAt: -1 } },
      { $group: { _id: "$sourceId", latestId: { $first: "$_id" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    if (duplicates.length > 0) {
      const keepIds = duplicates.map((d) => d.latestId);
      const dupSourceIds = duplicates.map((d) => d._id);
      const dupResult = await CalendarEvent(req.user.academyId).deleteMany({
        user: syncUserId,
        sourceId: { $in: dupSourceIds },
        _id: { $nin: keepIds },
      });
      removed += dupResult.deletedCount;
    }

    // 3. 레거시 altForm school-scope 이벤트 정리 (개인 일정으로 전환됨)
    const legacyAltFormResult = await CalendarEvent(req.user.academyId).deleteMany({
      sourceType: "altForm",
      scope: "school",
    });
    removed += legacyAltFormResult.deletedCount;

    return res.status(200).send({ synced: created, removed, total: eventsToCreate.length });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
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

  // Pre-compute shared fields once (avoid per-instance object spread)
  const sharedFields = {
    _id: event._id,
    title: event.title,
    description: event.description,
    isAllDay: event.isAllDay,
    scope: event.scope,
    school: event.school,
    user: event.user,
    recurrence: event.recurrence,
    color: event.color,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    syllabusId: event.syllabusId,
    calendarId: event.calendarId,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    recurrenceParentId: event._id,
    isRecurrenceInstance: true,
  };

  // Weekly with specific days: iterate week-by-week instead of day-by-day
  if (event.recurrence.type === "weekly" && event.recurrence.days?.length > 0) {
    const days = event.recurrence.days;

    // Compare dates without time for start boundary
    const eventStartDateOnly = new Date(eventStart);
    eventStartDateOnly.setHours(0, 0, 0, 0);

    // Start from the beginning of the week containing max(eventStart, queryStart)
    let weekStart = new Date(Math.max(eventStartDateOnly.getTime(), queryStart.getTime()));
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    while (weekStart <= effectiveEnd) {
      for (const dayOfWeek of days) {
        const instanceDate = new Date(weekStart);
        instanceDate.setDate(instanceDate.getDate() + dayOfWeek);

        if (instanceDate < eventStartDateOnly || instanceDate > effectiveEnd) continue;

        const instanceStart = new Date(instanceDate);
        instanceStart.setHours(
          eventStart.getHours(),
          eventStart.getMinutes(),
          eventStart.getSeconds(),
          eventStart.getMilliseconds()
        );
        const instanceEnd = new Date(instanceStart.getTime() + duration);

        if (instanceEnd >= queryStart && instanceStart <= queryEnd) {
          instances.push({
            ...sharedFields,
            start: instanceStart,
            end: instanceEnd,
          });
        }
      }
      weekStart.setDate(weekStart.getDate() + 7);
    }

    return instances;
  }

  // Default logic for daily, monthly, and weekly without specific days
  let current = new Date(eventStart);

  while (current <= effectiveEnd) {
    const instanceEnd = new Date(current.getTime() + duration);

    if (instanceEnd >= queryStart && current <= queryEnd) {
      instances.push({
        ...sharedFields,
        start: new Date(current),
        end: new Date(instanceEnd),
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
