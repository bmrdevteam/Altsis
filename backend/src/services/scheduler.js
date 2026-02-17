/**
 * Scheduler Service namespace
 * @namespace Services.SchedulerService
 *
 * @description Redis Sorted Set 기반 스케줄링 서비스
 * 매분 Redis에서 도래한 알림/리마인더만 조회하여 처리
 * (기존 MongoDB 폴링 방식에서 전환)
 */

import cron from "node-cron";
import {
  Academy,
  CalendarEvent,
  NotificationSetting,
  Reminder,
  User,
} from "../models/index.js";
import { conn } from "../_database/mongodb/index.js";
import { client } from "../_database/redis/index.js";
import { sendAutoNotification } from "./notifications.js";
import { logger } from "../log/logger.js";
import {
  registerEventNotification,
  registerEventReminder,
  syncAllToRedis,
} from "./schedulerQueue.js";

const NOTIFICATIONS_KEY = "scheduler:notifications";
const REMINDERS_KEY = "scheduler:reminders";
const DEDUP_TTL = 24 * 60 * 60; // 24시간 (초)

// ========== Redis 기반 중복 방지 (Stage 2) ==========

/**
 * 이미 처리된 항목인지 확인
 * @param {string} key - 중복 방지 키
 * @returns {Promise<boolean>}
 */
async function isDuplicate(key) {
  try {
    const val = await client.v4.get(key);
    return val !== null;
  } catch (err) {
    logger.error(`Redis isDuplicate failed: ${err.message}`);
    return false;
  }
}

/**
 * 처리 완료 표시 (24시간 TTL)
 * @param {string} key - 중복 방지 키
 */
async function markProcessed(key) {
  try {
    await client.v4.set(key, "1", { EX: DEDUP_TTL });
  } catch (err) {
    logger.error(`Redis markProcessed failed: ${err.message}`);
  }
}

// ========== 알림 수신자 목록 구성 ==========

/**
 * 이벤트의 알림 수신자 목록 구성
 * @param {string} academyId
 * @param {Object} event - CalendarEvent document
 * @returns {Promise<Array|null>} 수신자 목록 또는 null
 */
async function buildRecipientList(academyId, event) {
  const user = await User(academyId).findById(event.user);
  if (!user) return null;

  const toUserList = [
    {
      user: user._id,
      userId: user.userId,
      userName: user.userName,
    },
  ];

  // 학교 일정인 경우 해당 학교 소속 사용자들에게도 알림
  if (event.scope === "school" && event.school) {
    const schoolUsers = await User(academyId).find({
      "schools.school": event.school,
      _id: { $ne: user._id },
    });

    for (const schoolUser of schoolUsers) {
      toUserList.push({
        user: schoolUser._id,
        userId: schoolUser.userId,
        userName: schoolUser.userName,
      });
    }
  }

  return toUserList;
}

// ========== 이벤트 시작 알림 처리 ==========

/**
 * Redis Sorted Set에서 도래한 이벤트 시작 알림을 조회하여 처리
 * @memberof Services.SchedulerService
 */
const processNotifications = async () => {
  try {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // 도래한 항목만 조회
    const entries = await client.v4.zRangeByScore(
      NOTIFICATIONS_KEY,
      oneMinuteAgo,
      now
    );

    if (entries.length === 0) return;

    logger.info(`Processing ${entries.length} event start notification(s)`);

    for (const memberStr of entries) {
      let member;
      try {
        member = JSON.parse(memberStr);
      } catch {
        await client.v4.zRem(NOTIFICATIONS_KEY, memberStr);
        continue;
      }

      const { academyId, eventId, instanceDate } = member;

      if (!conn[academyId]) {
        await client.v4.zRem(NOTIFICATIONS_KEY, memberStr);
        continue;
      }

      // 중복 방지 확인
      const dedupKey = instanceDate
        ? `scheduler:dedup:notif:${academyId}:${eventId}:${instanceDate}`
        : `scheduler:dedup:notif:${academyId}:${eventId}`;

      if (await isDuplicate(dedupKey)) {
        await client.v4.zRem(NOTIFICATIONS_KEY, memberStr);
        continue;
      }

      try {
        const event = await CalendarEvent(academyId).findById(eventId);
        if (!event) {
          await client.v4.zRem(NOTIFICATIONS_KEY, memberStr);
          continue;
        }

        const toUserList = await buildRecipientList(academyId, event);
        if (!toUserList) {
          await client.v4.zRem(NOTIFICATIONS_KEY, memberStr);
          continue;
        }

        // 알림 발송
        await sendAutoNotification({
          academyId,
          toUserList,
          notificationType: "scheduleStart",
          category: "일정",
          title: `[일정 시작] ${event.title}`,
          description: event.description || "일정이 시작되었습니다.",
          relatedEntity: {
            type: "calendarEvent",
            id: event._id,
          },
        });

        await markProcessed(dedupKey);
        await client.v4.zRem(NOTIFICATIONS_KEY, memberStr);

        // 반복 일정이면 다음 인스턴스 등록
        if (event.recurrence?.type && event.recurrence.type !== "none") {
          await registerEventNotification(academyId, event);
        }

        logger.info(
          `Schedule notification sent: ${event.title} (${eventId}) in ${academyId}`
        );
      } catch (err) {
        logger.error(
          `Error processing notification ${eventId} in ${academyId}: ${err.message}`
        );
      }
    }
  } catch (err) {
    logger.error(`processNotifications failed: ${err.message}`);
  }
};

// ========== 리마인더 처리 ==========

/**
 * Redis Sorted Set에서 도래한 리마인더를 조회하여 처리
 * @memberof Services.SchedulerService
 */
const processReminders = async () => {
  try {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    const entries = await client.v4.zRangeByScore(
      REMINDERS_KEY,
      oneMinuteAgo,
      now
    );

    if (entries.length === 0) return;

    logger.info(`Processing ${entries.length} reminder(s)`);

    for (const memberStr of entries) {
      let member;
      try {
        member = JSON.parse(memberStr);
      } catch {
        await client.v4.zRem(REMINDERS_KEY, memberStr);
        continue;
      }

      const { academyId, type, eventId, reminderId, instanceDate } = member;

      if (!conn[academyId]) {
        await client.v4.zRem(REMINDERS_KEY, memberStr);
        continue;
      }

      try {
        if (type === "standaloneReminder") {
          await processStandaloneReminder(academyId, reminderId, memberStr);
        } else if (type === "eventReminder") {
          await processEventReminder(
            academyId,
            eventId,
            instanceDate,
            memberStr
          );
        } else {
          await client.v4.zRem(REMINDERS_KEY, memberStr);
        }
      } catch (err) {
        logger.error(
          `Error processing reminder in ${academyId}: ${err.message}`
        );
      }
    }
  } catch (err) {
    logger.error(`processReminders failed: ${err.message}`);
  }
};

/**
 * 독립 리마인더 처리
 */
async function processStandaloneReminder(academyId, reminderId, memberStr) {
  const reminder = await Reminder(academyId).findById(reminderId);
  if (!reminder || reminder.completed || reminder.notified) {
    await client.v4.zRem(REMINDERS_KEY, memberStr);
    return;
  }

  const user = await User(academyId).findById(reminder.user);
  if (!user) {
    await client.v4.zRem(REMINDERS_KEY, memberStr);
    return;
  }

  await sendAutoNotification({
    academyId,
    toUserList: [
      {
        user: user._id,
        userId: user.userId,
        userName: user.userName,
      },
    ],
    notificationType: "reminder",
    category: "리마인더",
    title: reminder.title,
    description: reminder.memo || "",
    relatedEntity: {
      type: "reminder",
      id: reminder._id,
    },
  });

  reminder.notified = true;
  await reminder.save();

  await client.v4.zRem(REMINDERS_KEY, memberStr);
  logger.info(
    `Standalone reminder sent: ${reminder.title} (${reminderId}) in ${academyId}`
  );
}

/**
 * 이벤트 기반 리마인더 처리
 */
async function processEventReminder(
  academyId,
  eventId,
  instanceDate,
  memberStr
) {
  // 중복 방지
  const dedupKey = instanceDate
    ? `scheduler:dedup:reminder:${academyId}:${eventId}:${instanceDate}`
    : `scheduler:dedup:reminder:${academyId}:${eventId}`;

  if (await isDuplicate(dedupKey)) {
    await client.v4.zRem(REMINDERS_KEY, memberStr);
    return;
  }

  const event = await CalendarEvent(academyId).findById(eventId);
  if (!event || !event.reminder?.enabled) {
    await client.v4.zRem(REMINDERS_KEY, memberStr);
    return;
  }

  // 리마인더 시간 계산
  const setting = await NotificationSetting(academyId).findOne({
    user: event.user,
  });
  const minutesBefore = event.reminder.useDefault
    ? setting?.settings?.eventReminderDefault || 15
    : event.reminder.minutesBefore || 15;

  const toUserList = await buildRecipientList(academyId, event);
  if (!toUserList) {
    await client.v4.zRem(REMINDERS_KEY, memberStr);
    return;
  }

  await sendAutoNotification({
    academyId,
    toUserList,
    notificationType: "reminder",
    category: "리마인더",
    title: `[${minutesBefore}분 전] ${event.title}`,
    description: event.description || "",
    relatedEntity: {
      type: "calendarEvent",
      id: event._id,
    },
  });

  await markProcessed(dedupKey);
  await client.v4.zRem(REMINDERS_KEY, memberStr);

  // 반복 일정이면 다음 인스턴스의 리마인더 등록
  if (event.recurrence?.type && event.recurrence.type !== "none") {
    const defaultMin = setting?.settings?.eventReminderDefault || 15;
    await registerEventReminder(academyId, event, defaultMin);
  }

  logger.info(
    `Event reminder sent: ${event.title} (${eventId}) in ${academyId}`
  );
}

// ========== 스케줄러 초기화 ==========

/**
 * 스케줄러 초기화 (Redis Sorted Set 모드)
 * @memberof Services.SchedulerService
 * @function initializeScheduler
 *
 * @description 서버 시작 시 MongoDB → Redis 동기화 후 cron 등록
 */
export const initializeScheduler = async () => {
  // 서버 시작 시 MongoDB → Redis 일괄 동기화
  try {
    const academies = await Academy.find({ isActivated: true });
    await syncAllToRedis(academies);
  } catch (err) {
    logger.error(`Scheduler initial sync failed: ${err.message}`);
  }

  // 매분 실행: Redis Sorted Set에서 도래한 항목만 처리
  cron.schedule("* * * * *", async () => {
    await Promise.all([processNotifications(), processReminders()]);
  });

  logger.info(
    "Scheduler initialized (Redis sorted set mode) - notifications and reminders enabled"
  );
};
