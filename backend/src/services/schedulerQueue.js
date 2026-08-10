/**
 * Scheduler Queue Service
 * @namespace Services.SchedulerQueue
 *
 * @description Redis Sorted Set 기반 스케줄러 큐 관리
 * Event start notifications와 reminders를 Sorted Set으로 관리하여
 * 폴링 대신 시간 기반 조회로 효율적으로 처리
 */

import { client } from "../_database/redis/index.js";
import {
  CalendarEvent,
  NotificationSetting,
  Reminder,
} from "../models/index.js";
import { conn } from "../_database/mongodb/index.js";
import { logger } from "../log/logger.js";

const NOTIFICATIONS_KEY = "scheduler:notifications";
const REMINDERS_KEY = "scheduler:reminders";
const REVERSE_INDEX_TTL = 7 * 24 * 60 * 60; // 7일

// ========== Helper: getNextRecurringInstance ==========

/**
 * 반복 일정의 다음 발생 시각을 계산
 * @param {Object} event - CalendarEvent document
 * @param {Date} fromTime - 이 시각 이후의 다음 인스턴스를 찾음
 * @returns {Date|null} 다음 인스턴스 시작 시각, 없으면 null
 */
export function getNextRecurringInstance(event, fromTime) {
  const eventStart = new Date(event.start);
  const recurrenceEnd = event.recurrence?.endDate
    ? new Date(event.recurrence.endDate)
    : null;
  const recurrenceType = event.recurrence?.type;

  if (!recurrenceType || recurrenceType === "none") return null;

  const eventHour = eventStart.getHours();
  const eventMinute = eventStart.getMinutes();
  const eventSecond = eventStart.getSeconds();
  const eventMs = eventStart.getMilliseconds();

  if (recurrenceType === "daily") {
    let candidate = new Date(fromTime);
    candidate.setHours(eventHour, eventMinute, eventSecond, eventMs);
    if (candidate <= fromTime) {
      candidate.setDate(candidate.getDate() + 1);
    }
    if (candidate < eventStart) {
      candidate = new Date(eventStart);
    }
    if (recurrenceEnd && candidate > recurrenceEnd) return null;
    return candidate;
  }

  if (recurrenceType === "weekly") {
    const eventDays =
      event.recurrence?.days?.length > 0
        ? [...event.recurrence.days].sort((a, b) => a - b)
        : [eventStart.getDay()];

    for (let offset = 0; offset <= 7; offset++) {
      const candidate = new Date(fromTime);
      candidate.setDate(candidate.getDate() + offset);
      candidate.setHours(eventHour, eventMinute, eventSecond, eventMs);

      if (candidate <= fromTime) continue;
      if (candidate < eventStart) continue;
      if (recurrenceEnd && candidate > recurrenceEnd) return null;

      if (eventDays.includes(candidate.getDay())) {
        return candidate;
      }
    }
    return null;
  }

  if (recurrenceType === "monthly") {
    const eventDate = eventStart.getDate();
    let candidate = new Date(fromTime);
    candidate.setDate(eventDate);
    candidate.setHours(eventHour, eventMinute, eventSecond, eventMs);

    if (candidate <= fromTime) {
      candidate.setMonth(candidate.getMonth() + 1);
      candidate.setDate(eventDate);
    }
    if (candidate < eventStart) {
      candidate = new Date(eventStart);
    }
    if (recurrenceEnd && candidate > recurrenceEnd) return null;
    return candidate;
  }

  return null;
}

// ========== Internal Helpers ==========

/**
 * Sorted Set member 문자열 생성
 */
function buildMember({ academyId, type, eventId, reminderId, instanceDate }) {
  const obj = { academyId, type };
  if (eventId) obj.eventId = eventId;
  if (reminderId) obj.reminderId = reminderId;
  if (instanceDate) obj.instanceDate = instanceDate;
  return JSON.stringify(obj);
}

/**
 * Sorted Set에 추가하고 역인덱스도 함께 관리
 */
async function addToSortedSet(sortedSetKey, academyId, entityId, member, score) {
  await client.v4.zAdd(sortedSetKey, { score, value: member });
  if (entityId) {
    const reverseKey = `scheduler:event-members:${academyId}:${entityId}`;
    await client.v4.sAdd(reverseKey, `${sortedSetKey}::${member}`);
    await client.v4.expire(reverseKey, REVERSE_INDEX_TTL);
  }
}

/**
 * 역인덱스를 이용해 특정 엔티티의 모든 Sorted Set 항목 삭제
 */
async function removeEntriesByEntityId(academyId, entityId) {
  const reverseKey = `scheduler:event-members:${academyId}:${entityId}`;
  try {
    const entries = await client.v4.sMembers(reverseKey);
    if (entries.length > 0) {
      // entries 형식: "sortedSetKey::memberJson"
      for (const entry of entries) {
        const separatorIdx = entry.indexOf("::");
        if (separatorIdx === -1) continue;
        const setKey = entry.substring(0, separatorIdx);
        const member = entry.substring(separatorIdx + 2);
        await client.v4.zRem(setKey, member);
      }
      await client.v4.del(reverseKey);
    }
  } catch (err) {
    logger.error(`removeEntriesByEntityId failed: ${err.message}`);
  }
}

// ========== Queue Management Functions ==========

/**
 * 이벤트 시작 알림을 Sorted Set에 등록
 * @param {string} academyId
 * @param {Object} event - CalendarEvent document
 */
export async function registerEventNotification(academyId, event) {
  try {
    if (!event || event.isAllDay) return;
    if (event.sourceType && event.sourceType !== "manual") return;

    const now = new Date();
    const recurrenceType = event.recurrence?.type;

    if (!recurrenceType || recurrenceType === "none") {
      // 비반복: 이벤트 시작 시각에 등록
      const startTime = new Date(event.start).getTime();
      if (startTime <= now.getTime()) return;

      const member = buildMember({
        academyId,
        type: "eventStart",
        eventId: String(event._id),
      });
      await addToSortedSet(
        NOTIFICATIONS_KEY,
        academyId,
        String(event._id),
        member,
        startTime
      );
    } else {
      // 반복: 다음 인스턴스만 등록
      const nextInstance = getNextRecurringInstance(event, now);
      if (!nextInstance) return;

      const member = buildMember({
        academyId,
        type: "eventStart",
        eventId: String(event._id),
        instanceDate: nextInstance.toISOString().split("T")[0],
      });
      await addToSortedSet(
        NOTIFICATIONS_KEY,
        academyId,
        String(event._id),
        member,
        nextInstance.getTime()
      );
    }
  } catch (err) {
    logger.error(`registerEventNotification failed: ${err.message}`);
  }
}

/**
 * 이벤트의 모든 알림 항목을 Sorted Set에서 제거
 * @param {string} academyId
 * @param {string} eventId
 */
export async function removeEventNotification(academyId, eventId) {
  try {
    await removeEntriesByEntityId(academyId, eventId);
  } catch (err) {
    logger.error(`removeEventNotification failed: ${err.message}`);
  }
}

/**
 * 이벤트 기반 리마인더를 Sorted Set에 등록
 * @param {string} academyId
 * @param {Object} event - CalendarEvent document
 * @param {number} [defaultMinutes=15] - 기본 리마인더 시간 (분)
 */
export async function registerEventReminder(
  academyId,
  event,
  defaultMinutes = 15
) {
  try {
    if (!event || event.isAllDay) return;
    if (!event.reminder?.enabled) return;
    if (event.sourceType && event.sourceType !== "manual") return;

    const minutesBefore = event.reminder.useDefault
      ? defaultMinutes
      : event.reminder.minutesBefore || 15;

    const now = new Date();
    const recurrenceType = event.recurrence?.type;

    if (!recurrenceType || recurrenceType === "none") {
      // 비반복
      const eventStart = new Date(event.start);
      const reminderTime = new Date(
        eventStart.getTime() - minutesBefore * 60 * 1000
      );
      if (reminderTime.getTime() <= now.getTime()) return;

      const member = buildMember({
        academyId,
        type: "eventReminder",
        eventId: String(event._id),
      });
      await addToSortedSet(
        REMINDERS_KEY,
        academyId,
        String(event._id),
        member,
        reminderTime.getTime()
      );
    } else {
      // 반복: 다음 인스턴스의 리마인더 시각 계산
      const nextInstance = getNextRecurringInstance(event, now);
      if (!nextInstance) return;

      let reminderTime = new Date(
        nextInstance.getTime() - minutesBefore * 60 * 1000
      );

      // 리마인더 시각이 이미 지났으면 다음 인스턴스로
      if (reminderTime.getTime() <= now.getTime()) {
        const nextNextInstance = getNextRecurringInstance(event, nextInstance);
        if (!nextNextInstance) return;
        reminderTime = new Date(
          nextNextInstance.getTime() - minutesBefore * 60 * 1000
        );
        if (reminderTime.getTime() <= now.getTime()) return;

        const member = buildMember({
          academyId,
          type: "eventReminder",
          eventId: String(event._id),
          instanceDate: nextNextInstance.toISOString().split("T")[0],
        });
        await addToSortedSet(
          REMINDERS_KEY,
          academyId,
          String(event._id),
          member,
          reminderTime.getTime()
        );
      } else {
        const member = buildMember({
          academyId,
          type: "eventReminder",
          eventId: String(event._id),
          instanceDate: nextInstance.toISOString().split("T")[0],
        });
        await addToSortedSet(
          REMINDERS_KEY,
          academyId,
          String(event._id),
          member,
          reminderTime.getTime()
        );
      }
    }
  } catch (err) {
    logger.error(`registerEventReminder failed: ${err.message}`);
  }
}

/**
 * 이벤트의 모든 리마인더 항목을 Sorted Set에서 제거
 * (removeEventNotification과 같은 역인덱스 사용)
 * @param {string} academyId
 * @param {string} eventId
 */
export async function removeEventReminder(academyId, eventId) {
  // removeEventNotification이 역인덱스 전체를 삭제하므로
  // 별도 호출은 이미 역인덱스가 삭제된 후에는 no-op
  // 하지만 안전하게 동일 로직 실행
  try {
    await removeEntriesByEntityId(academyId, eventId);
  } catch (err) {
    logger.error(`removeEventReminder failed: ${err.message}`);
  }
}

/**
 * 독립 리마인더를 Sorted Set에 등록
 * @param {string} academyId
 * @param {Object} reminder - Reminder document
 */
export async function registerStandaloneReminder(academyId, reminder) {
  try {
    if (reminder.completed || reminder.notified) return;
    const reminderTime = new Date(reminder.reminderTime).getTime();
    // 이미 도래했거나 직전이면 다음 cron 틱에서 처리되도록 현재 시각으로 등록
    const score = Math.max(reminderTime, Date.now());

    const member = buildMember({
      academyId,
      type: "standaloneReminder",
      reminderId: String(reminder._id),
    });
    await addToSortedSet(
      REMINDERS_KEY,
      academyId,
      `reminder:${String(reminder._id)}`,
      member,
      score
    );
  } catch (err) {
    logger.error(`registerStandaloneReminder failed: ${err.message}`);
  }
}

/**
 * 독립 리마인더를 Sorted Set에서 제거
 * @param {string} academyId
 * @param {string} reminderId
 */
export async function removeStandaloneReminder(academyId, reminderId) {
  try {
    await removeEntriesByEntityId(academyId, `reminder:${reminderId}`);
  } catch (err) {
    logger.error(`removeStandaloneReminder failed: ${err.message}`);
  }
}

// ========== Startup Sync ==========

/**
 * 서버 시작 시 MongoDB → Redis Sorted Set 일괄 동기화
 * 기존 Redis 데이터를 초기화 후 재구축
 * @param {Array} academies - 활성 아카데미 목록
 */
export async function syncAllToRedis(academies) {
  logger.info("Starting scheduler Redis sync...");
  const now = new Date();
  let eventCount = 0;
  let reminderCount = 0;

  // 기존 스케줄러 데이터 초기화
  try {
    await client.v4.del(NOTIFICATIONS_KEY);
    await client.v4.del(REMINDERS_KEY);
  } catch (err) {
    logger.error(`Failed to clear scheduler Redis keys: ${err.message}`);
  }

  for (const academy of academies) {
    const academyId = academy.academyId;
    if (!conn[academyId]) continue;

    try {
      // 1. 미래 비반복 수동 이벤트
      const futureEvents = await CalendarEvent(academyId)
        .find({
          sourceType: { $in: ["manual", null] },
          isAllDay: false,
          $or: [
            { "recurrence.type": "none" },
            { "recurrence.type": { $exists: false } },
            { recurrence: { $exists: false } },
          ],
          start: { $gt: now },
        })
        .lean();

      for (const event of futureEvents) {
        await registerEventNotification(academyId, event);
        if (event.reminder?.enabled) {
          const setting = await NotificationSetting(academyId).findOne({
            user: event.user,
          });
          const defaultMin = setting?.settings?.eventReminderDefault || 15;
          await registerEventReminder(academyId, event, defaultMin);
        }
        eventCount++;
      }

      // 2. 활성 반복 수동 이벤트
      const recurringEvents = await CalendarEvent(academyId)
        .find({
          sourceType: { $in: ["manual", null] },
          isAllDay: false,
          "recurrence.type": { $in: ["daily", "weekly", "monthly"] },
          $or: [
            { "recurrence.endDate": { $gte: now } },
            { "recurrence.endDate": { $exists: false } },
            { "recurrence.endDate": null },
          ],
        })
        .lean();

      for (const event of recurringEvents) {
        await registerEventNotification(academyId, event);
        if (event.reminder?.enabled) {
          const setting = await NotificationSetting(academyId).findOne({
            user: event.user,
          });
          const defaultMin = setting?.settings?.eventReminderDefault || 15;
          await registerEventReminder(academyId, event, defaultMin);
        }
        eventCount++;
      }

      // 3. 미처리 독립 리마인더
      const pendingReminders = await Reminder(academyId)
        .find({
          completed: false,
          notified: false,
          reminderTime: { $gt: now },
        })
        .lean();

      for (const reminder of pendingReminders) {
        await registerStandaloneReminder(academyId, reminder);
        reminderCount++;
      }
    } catch (err) {
      logger.error(
        `syncAllToRedis failed for academy ${academyId}: ${err.message}`
      );
    }
  }

  logger.info(
    `Scheduler Redis sync complete: ${eventCount} events, ${reminderCount} reminders registered`
  );
}
