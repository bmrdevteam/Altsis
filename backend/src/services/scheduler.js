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
  isScheduleStartEnabled,
  shouldExpandRecipientsToSchool,
} from "./calendarEventNotify.js";
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
 * 원자적 처리 클레임 (SET NX).
 * @param {string} key
 * @returns {Promise<boolean|null>} true=클레임 성공, false=이미 처리됨, null=Redis 오류(큐 유지)
 */
async function tryClaimProcessed(key) {
  try {
    const result = await client.v4.set(key, "1", {
      NX: true,
      EX: DEDUP_TTL,
    });
    return result === "OK";
  } catch (err) {
    logger.error(`Redis tryClaimProcessed failed: ${err.message}`);
    return null;
  }
}

/** 발송 실패 시 재시도를 위해 dedup 클레임을 해제한다. */
async function releaseClaim(key) {
  try {
    await client.v4.del(key);
  } catch (err) {
    logger.error(`Redis releaseClaim failed: ${err.message}`);
  }
}

/** cron 틱 중복 실행 방지 */
let schedulerTickRunning = false;

// ========== 알림 수신자 목록 구성 ==========

/**
 * 이벤트의 알림 수신자 목록 구성
 * 기본은 생성자만. notifySchool + school scope일 때만 학교 소속 전원 추가.
 * @param {string} academyId
 * @param {Object} event - CalendarEvent document
 * @returns {Promise<Array|null>} 수신자 목록 또는 null
 */
export async function buildRecipientList(academyId, event) {
  const user = await User(academyId).findById(event.user);
  if (!user) return null;

  const toUserList = [
    {
      user: user._id,
      userId: user.userId,
      userName: user.userName,
    },
  ];

  if (shouldExpandRecipientsToSchool(event)) {
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

      const claimed = await tryClaimProcessed(dedupKey);
      if (claimed === false) {
        await client.v4.zRem(NOTIFICATIONS_KEY, memberStr);
        continue;
      }
      if (claimed === null) {
        continue; // Redis 오류 — 큐에 남겨 다음 틱에서 재시도
      }

      try {
        const event = await CalendarEvent(academyId).findById(eventId);
        if (!event) {
          await client.v4.zRem(NOTIFICATIONS_KEY, memberStr);
          continue;
        }

        // 옵트인 해제·레거시 큐 항목 방어
        if (!isScheduleStartEnabled(event)) {
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
        await releaseClaim(dedupKey);
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
  const dedupKey = `scheduler:dedup:standalone:${academyId}:${reminderId}`;
  const claimed = await tryClaimProcessed(dedupKey);
  if (claimed === false) {
    await client.v4.zRem(REMINDERS_KEY, memberStr);
    return;
  }
  if (claimed === null) {
    return; // Redis 오류 — 큐에 남겨 재시도
  }

  try {
    // Mongo에서 원자적으로 claim (동시 처리 시 1회만 발송)
    const reminder = await Reminder(academyId).findOneAndUpdate(
      {
        _id: reminderId,
        completed: { $ne: true },
        notified: { $ne: true },
      },
      { $set: { notified: true } },
      { new: true }
    );

    if (!reminder) {
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
    await client.v4.zRem(REMINDERS_KEY, memberStr);
    logger.info(
      `Standalone reminder sent: ${reminder.title} (${reminderId}) in ${academyId}`
    );
  } catch (err) {
    logger.error(
      `Standalone reminder notify failed ${reminderId}: ${err.message}`
    );
    // 발송 실패 시 재시도 가능하도록 claim 롤백
    try {
      await Reminder(academyId).updateOne(
        { _id: reminderId },
        { $set: { notified: false } }
      );
    } catch (rollbackErr) {
      logger.error(
        `Standalone reminder rollback failed ${reminderId}: ${rollbackErr.message}`
      );
    }
    await releaseClaim(dedupKey);
  }
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

  const claimed = await tryClaimProcessed(dedupKey);
  if (claimed === false) {
    await client.v4.zRem(REMINDERS_KEY, memberStr);
    return;
  }
  if (claimed === null) {
    return;
  }

  try {
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

    await client.v4.zRem(REMINDERS_KEY, memberStr);

    // 반복 일정이면 다음 인스턴스의 리마인더 등록
    if (event.recurrence?.type && event.recurrence.type !== "none") {
      const defaultMin = setting?.settings?.eventReminderDefault || 15;
      await registerEventReminder(academyId, event, defaultMin);
    }

    logger.info(
      `Event reminder sent: ${event.title} (${eventId}) in ${academyId}`
    );
  } catch (err) {
    logger.error(
      `Error processing event reminder ${eventId} in ${academyId}: ${err.message}`
    );
    await releaseClaim(dedupKey);
  }
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
    if (schedulerTickRunning) {
      logger.warn("Scheduler tick skipped: previous tick still running");
      return;
    }
    schedulerTickRunning = true;
    try {
      await Promise.all([processNotifications(), processReminders()]);
    } finally {
      schedulerTickRunning = false;
    }
  });

  logger.info(
    "Scheduler initialized (Redis sorted set mode) - notifications and reminders enabled"
  );
};
