/**
 * Scheduler Service namespace
 * @namespace Services.SchedulerService
 *
 * @description 일정 시작 알림 등 스케줄링 기반 작업을 처리하는 서비스
 */

import cron from "node-cron";
import { Academy, CalendarEvent, NotificationSetting, Reminder, User } from "../models/index.js";
import { conn } from "../_database/mongodb/index.js";
import { sendAutoNotification } from "./notifications.js";
import { logger } from "../log/logger.js";

/**
 * 반복 일정의 현재 시간대 인스턴스 찾기
 * @param {Object} event - 캘린더 이벤트
 * @param {Date} windowStart - 검색 시작 시간
 * @param {Date} windowEnd - 검색 종료 시간
 * @returns {Array} 시간대에 시작하는 인스턴스 목록
 */
function getRecurringInstances(event, windowStart, windowEnd) {
  const instances = [];
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  const duration = eventEnd.getTime() - eventStart.getTime();

  const recurrenceEnd = event.recurrence?.endDate
    ? new Date(event.recurrence.endDate)
    : null;

  // 반복 종료일이 있고, 검색 시작보다 이전이면 빈 배열 반환
  if (recurrenceEnd && recurrenceEnd < windowStart) {
    return instances;
  }

  const recurrenceType = event.recurrence?.type;
  if (!recurrenceType || recurrenceType === "none") {
    return instances;
  }

  // 현재 시간대의 요일과 시간 확인
  const eventHour = eventStart.getHours();
  const eventMinute = eventStart.getMinutes();

  if (recurrenceType === "weekly") {
    // 주간 반복: recurrence.days 배열이 있으면 해당 요일들을 확인,
    // 없으면 이벤트 시작 요일만 확인
    const eventDays =
      event.recurrence?.days?.length > 0
        ? event.recurrence.days
        : [eventStart.getDay()];

    const currentDay = new Date(windowStart).getDay();

    for (const eventDay of eventDays) {
      // 현재 요일과 이벤트 요일이 다르면 스킵
      if (currentDay !== eventDay) continue;

      let checkDate = new Date(windowStart);
      checkDate.setHours(eventHour, eventMinute, 0, 0);

      // 검색 범위 안에 있고, 이벤트 시작일 이후이며, 반복 종료일 이전인지 확인
      if (
        checkDate >= windowStart &&
        checkDate <= windowEnd &&
        checkDate >= eventStart &&
        (!recurrenceEnd || checkDate <= recurrenceEnd)
      ) {
        instances.push({
          ...event.toObject ? event.toObject() : event,
          instanceStart: checkDate,
          instanceEnd: new Date(checkDate.getTime() + duration),
        });
      }
    }
  } else if (recurrenceType === "daily") {
    // 일간 반복: 매일 같은 시간에 발생
    let checkDate = new Date(windowStart);
    checkDate.setHours(eventHour, eventMinute, 0, 0);

    if (checkDate < windowStart) {
      checkDate.setDate(checkDate.getDate() + 1);
    }

    if (
      checkDate >= windowStart &&
      checkDate <= windowEnd &&
      checkDate >= eventStart &&
      (!recurrenceEnd || checkDate <= recurrenceEnd)
    ) {
      instances.push({
        ...event.toObject ? event.toObject() : event,
        instanceStart: checkDate,
        instanceEnd: new Date(checkDate.getTime() + duration),
      });
    }
  } else if (recurrenceType === "monthly") {
    // 월간 반복: 매월 같은 날짜, 같은 시간에 발생
    const eventDate = eventStart.getDate();
    let checkDate = new Date(windowStart);
    checkDate.setDate(eventDate);
    checkDate.setHours(eventHour, eventMinute, 0, 0);

    if (
      checkDate >= windowStart &&
      checkDate <= windowEnd &&
      checkDate >= eventStart &&
      (!recurrenceEnd || checkDate <= recurrenceEnd)
    ) {
      instances.push({
        ...event.toObject ? event.toObject() : event,
        instanceStart: checkDate,
        instanceEnd: new Date(checkDate.getTime() + duration),
      });
    }
  }

  return instances;
}

/**
 * 일정 시작 알림 발송
 * @memberof Services.SchedulerService
 * @function checkScheduleStartNotifications
 *
 * @description 1분마다 실행되어 시작되는 일정에 대해 알림을 발송
 */
// 이미 알림을 보낸 일정 ID 저장 (중복 방지) - 인스턴스 날짜 포함
const notifiedEvents = new Set();

const checkScheduleStartNotifications = async () => {
  try {
    const now = new Date();
    // 1분 전부터 현재까지 시작된 일정 확인 (방금 시작된 일정)
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    logger.info(`Checking for schedule notifications: ${oneMinuteAgo.toISOString()} ~ ${now.toISOString()}`);

    // 모든 아카데미 조회
    const academies = await Academy.find({ isActivated: true });

    for (const academy of academies) {
      const academyId = academy.academyId;

      // 해당 아카데미 DB 연결이 있는지 확인
      if (!conn[academyId]) {
        continue;
      }

      try {
        // 1. 비반복 일정: 시작 시간이 1분 전 ~ 현재 사이인 일정
        // 동기화된 이벤트(enrollment, syllabus, memo)는 알림 대상에서 제외
        const nonRecurringEvents = await CalendarEvent(academyId).find({
          $or: [
            { "recurrence.type": "none" },
            { "recurrence.type": { $exists: false } },
            { recurrence: { $exists: false } },
          ],
          start: {
            $gte: oneMinuteAgo,
            $lte: now,
          },
          isAllDay: false,
          sourceType: { $in: ["manual", null] },
        });

        // 2. 반복 일정: 현재 시간대에 인스턴스가 있을 수 있는 이벤트
        const recurringEvents = await CalendarEvent(academyId).find({
          "recurrence.type": { $in: ["daily", "weekly", "monthly"] },
          start: { $lte: now }, // 시작일이 현재 이전
          $or: [
            { "recurrence.endDate": { $gte: oneMinuteAgo } },
            { "recurrence.endDate": { $exists: false } },
            { "recurrence.endDate": null },
          ],
          isAllDay: false,
          sourceType: { $in: ["manual", null] },
        });

        // 알림 대상 이벤트 목록 구성
        const eventsToNotify = [];

        // 비반복 일정 추가
        for (const event of nonRecurringEvents) {
          eventsToNotify.push({
            event,
            instanceStart: event.start,
            eventKey: `${academyId}:${event._id}`,
          });
        }

        // 반복 일정의 현재 인스턴스 찾기
        for (const event of recurringEvents) {
          const instances = getRecurringInstances(event, oneMinuteAgo, now);
          for (const instance of instances) {
            // 인스턴스 날짜를 포함한 고유 키 생성 (같은 이벤트의 다른 주차 구분)
            const instanceDateStr = instance.instanceStart.toISOString().split("T")[0];
            eventsToNotify.push({
              event,
              instanceStart: instance.instanceStart,
              eventKey: `${academyId}:${event._id}:${instanceDateStr}`,
            });
          }
        }

        logger.info(`Found ${eventsToNotify.length} events to notify in academy ${academyId} (${nonRecurringEvents.length} non-recurring, ${recurringEvents.length} recurring checked)`);

        for (const { event, eventKey } of eventsToNotify) {
          // 이미 알림을 보낸 일정인지 확인
          if (notifiedEvents.has(eventKey)) {
            continue;
          }

          // 일정 생성자(user)에게 알림 발송
          const user = await User(academyId).findById(event.user);
          if (!user) continue;

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
              _id: { $ne: user._id }, // 생성자 제외
            });

            for (const schoolUser of schoolUsers) {
              toUserList.push({
                user: schoolUser._id,
                userId: schoolUser.userId,
                userName: schoolUser.userName,
              });
            }
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

          // 알림 발송 완료 표시
          notifiedEvents.add(eventKey);

          // 24시간 후 Set에서 제거 (메모리 관리)
          setTimeout(() => {
            notifiedEvents.delete(eventKey);
          }, 24 * 60 * 60 * 1000);

          logger.info(
            `Schedule start notification sent for event: ${event.title} (${event._id}) in academy: ${academyId}`
          );
        }
      } catch (err) {
        logger.error(
          `Error processing schedule notifications for academy ${academyId}: ${err.message}`
        );
      }
    }
  } catch (err) {
    logger.error(`checkScheduleStartNotifications failed: ${err.message}`);
  }
};

/**
 * 리마인더 알림 발송
 * @memberof Services.SchedulerService
 * @function checkReminders
 *
 * @description 1분마다 실행되어 도래한 리마인더에 대해 알림을 발송
 */
const notifiedReminders = new Set();

const checkReminders = async () => {
  try {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    const academies = await Academy.find({ isActivated: true });

    for (const academy of academies) {
      const academyId = academy.academyId;
      if (!conn[academyId]) continue;

      try {
        // 1. 독립 리마인더 확인 (시간이 도래한 모든 미통보 리마인더)
        const dueReminders = await Reminder(academyId).find({
          completed: false,
          notified: false,
          reminderTime: { $lte: now },
        });

        for (const reminder of dueReminders) {
          const user = await User(academyId).findById(reminder.user);
          if (!user) continue;

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

          logger.info(
            `Reminder notification sent: ${reminder.title} (${reminder._id}) in academy: ${academyId}`
          );
        }

        // 2. 이벤트 기반 리마인더 확인
        // 리마인더가 활성화된 이벤트 조회
        const maxReminderMinutes = 1440; // 최대 1일 전
        const searchWindowEnd = new Date(
          now.getTime() + maxReminderMinutes * 60 * 1000
        );

        // 비반복 이벤트
        const nonRecurringReminderEvents = await CalendarEvent(academyId).find({
          "reminder.enabled": true,
          isAllDay: false,
          sourceType: { $in: ["manual", null] },
          $or: [
            { "recurrence.type": "none" },
            { "recurrence.type": { $exists: false } },
            { recurrence: { $exists: false } },
          ],
          start: { $gte: oneMinuteAgo, $lte: searchWindowEnd },
        });

        // 반복 이벤트
        const recurringReminderEvents = await CalendarEvent(academyId).find({
          "reminder.enabled": true,
          isAllDay: false,
          sourceType: { $in: ["manual", null] },
          "recurrence.type": { $in: ["daily", "weekly", "monthly"] },
          start: { $lte: searchWindowEnd },
          $or: [
            { "recurrence.endDate": { $gte: oneMinuteAgo } },
            { "recurrence.endDate": { $exists: false } },
            { "recurrence.endDate": null },
          ],
        });

        // 사용자별 기본 리마인더 시간 캐시
        const userDefaultMinutesCache = {};

        const getDefaultMinutes = async (userId) => {
          if (userDefaultMinutesCache[userId] !== undefined) {
            return userDefaultMinutesCache[userId];
          }
          const setting = await NotificationSetting(academyId).findOne({
            user: userId,
          });
          const minutes = setting?.settings?.eventReminderDefault || 15;
          userDefaultMinutesCache[userId] = minutes;
          return minutes;
        };

        // 이벤트 리마인더 처리
        const eventsToCheck = [];

        for (const event of nonRecurringReminderEvents) {
          eventsToCheck.push({
            event,
            instanceStart: event.start,
            eventKey: `${academyId}:${event._id}:reminder`,
          });
        }

        for (const event of recurringReminderEvents) {
          const instances = getRecurringInstances(
            event,
            oneMinuteAgo,
            searchWindowEnd
          );
          for (const instance of instances) {
            const instanceDateStr = instance.instanceStart
              .toISOString()
              .split("T")[0];
            eventsToCheck.push({
              event,
              instanceStart: instance.instanceStart,
              eventKey: `${academyId}:${event._id}:${instanceDateStr}:reminder`,
            });
          }
        }

        for (const { event, instanceStart, eventKey } of eventsToCheck) {
          if (notifiedReminders.has(eventKey)) continue;

          const minutesBefore = event.reminder.useDefault
            ? await getDefaultMinutes(event.user)
            : event.reminder.minutesBefore || 15;

          const reminderTime = new Date(
            new Date(instanceStart).getTime() - minutesBefore * 60 * 1000
          );

          // 리마인더 시각이 1분 전 ~ 현재 사이인지 확인
          if (reminderTime < oneMinuteAgo || reminderTime > now) continue;

          const user = await User(academyId).findById(event.user);
          if (!user) continue;

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

          notifiedReminders.add(eventKey);
          setTimeout(() => {
            notifiedReminders.delete(eventKey);
          }, 24 * 60 * 60 * 1000);

          logger.info(
            `Event reminder notification sent: ${event.title} (${event._id}) in academy: ${academyId}`
          );
        }
      } catch (err) {
        logger.error(
          `Error processing reminders for academy ${academyId}: ${err.message}`
        );
      }
    }
  } catch (err) {
    logger.error(`checkReminders failed: ${err.message}`);
  }
};

/**
 * 스케줄러 초기화
 * @memberof Services.SchedulerService
 * @function initializeScheduler
 *
 * @description 모든 스케줄링 작업을 시작
 */
export const initializeScheduler = () => {
  // 매 분 실행 (일정 시작 알림 + 리마인더)
  cron.schedule("* * * * *", () => {
    checkScheduleStartNotifications();
    checkReminders();
  });

  logger.info("✅ Scheduler initialized - schedule start notifications and reminders enabled");
};
