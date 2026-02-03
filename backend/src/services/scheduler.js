/**
 * Scheduler Service namespace
 * @namespace Services.SchedulerService
 *
 * @description 일정 시작 알림 등 스케줄링 기반 작업을 처리하는 서비스
 */

import cron from "node-cron";
import { Academy, CalendarEvent, User } from "../models/index.js";
import { conn } from "../_database/mongodb/index.js";
import { sendAutoNotification } from "./notifications.js";
import { logger } from "../log/logger.js";

/**
 * 일정 시작 알림 발송
 * @memberof Services.SchedulerService
 * @function checkScheduleStartNotifications
 *
 * @description 1분마다 실행되어 시작되는 일정에 대해 알림을 발송
 */
// 이미 알림을 보낸 일정 ID 저장 (중복 방지)
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
        // 시작 시간이 1분 전 ~ 현재 사이인 일정 조회 (방금 시작된 일정)
        const events = await CalendarEvent(academyId).find({
          start: {
            $gte: oneMinuteAgo,
            $lte: now,
          },
          isAllDay: false, // 종일 일정은 제외
        });

        logger.info(`Found ${events.length} events in academy ${academyId}`);

        for (const event of events) {
          // 이미 알림을 보낸 일정인지 확인
          const eventKey = `${academyId}:${event._id}`;
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
 * 스케줄러 초기화
 * @memberof Services.SchedulerService
 * @function initializeScheduler
 *
 * @description 모든 스케줄링 작업을 시작
 */
export const initializeScheduler = () => {
  // 매 분 실행 (일정 시작 알림)
  cron.schedule("* * * * *", () => {
    checkScheduleStartNotifications();
  });

  logger.info("✅ Scheduler initialized - schedule start notifications enabled");
};
