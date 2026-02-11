/**
 * Notification Service namespace
 * @namespace Services.NotificationService
 */

import { Notification, NotificationSetting } from "../models/index.js";
import { client } from "../_database/redis/index.js";
import { getIoNotification } from "../utils/webSocket.js";
import { logger } from "../log/logger.js";

/**
 * 자동 알림 발송
 * @memberof Services.NotificationService
 * @function sendAutoNotification
 *
 * @param {Object} params
 * @param {string} params.academyId - 아카데미 ID
 * @param {Array} params.toUserList - 수신자 목록 [{user, userId, userName}]
 * @param {string} params.notificationType - 알림 유형
 * @param {string} params.category - 카테고리
 * @param {string} params.title - 제목
 * @param {string} params.description - 내용
 * @param {Object} params.relatedEntity - 관련 엔티티 {type, id}
 * @param {Object} params.fromUser - 발신자 정보 (선택)
 *
 * @returns {Promise<Array>} 생성된 알림 목록
 */
export const sendAutoNotification = async ({
  academyId,
  toUserList,
  notificationType,
  category,
  title,
  description,
  relatedEntity,
  fromUser,
}) => {
  try {
    // 알림 설정 확인 - 해당 유형의 알림을 받지 않는 사용자 필터링
    const userIds = toUserList.map((u) => u.userId);
    const notificationSettings = await NotificationSetting(academyId).find({
      userId: { $in: userIds },
    });

    const settingsMap = {};
    for (let setting of notificationSettings) {
      settingsMap[setting.userId] = setting.settings;
    }

    // 알림 설정에서 해당 유형을 끈 사용자 제외
    const filteredUsers = toUserList.filter((user) => {
      const settings = settingsMap[user.userId];
      // 설정이 없으면 기본값 true (알림 받음)
      if (!settings) return true;
      // 해당 알림 유형이 false면 제외
      return settings[notificationType] !== false;
    });

    if (filteredUsers.length === 0) {
      return [];
    }

    // 알림 생성
    const notifications = filteredUsers.map((user) => ({
      type: "received",
      user: user.user,
      userId: user.userId,
      userName: user.userName,
      checked: false,
      fromUser: fromUser?._id || null,
      fromUserId: fromUser?.userId || "system",
      fromUserName: fromUser?.userName || "시스템",
      category,
      title,
      description,
      notificationType,
      relatedEntity,
      autoDeleteOnCheck: true,
    }));

    const createdNotifications = await Notification(academyId).insertMany(
      notifications
    );

    // WebSocket으로 알림 전송
    logger.info(`Sending WebSocket events to ${createdNotifications.length} users`);
    for (let notification of createdNotifications) {
      try {
        const redisKey = `${academyId}/${notification.userId}`;
        const data = await client.v4.hGet(
          "io/notification/user-sidList",
          redisKey
        );
        if (data) {
          const sidList = JSON.parse(data).sid;
          logger.info(`Found ${sidList?.length || 0} socket(s) for user ${notification.userId}`);
          sidList?.forEach((sid) => {
            getIoNotification().to(sid).emit("listen", "update notifications");
          });
        } else {
          logger.info(`No socket connection found for user ${notification.userId} (key: ${redisKey})`);
        }
      } catch (socketErr) {
        // WebSocket 실패는 무시
        logger.warn(`WebSocket notification failed: ${socketErr.message}`);
      }
    }

    return createdNotifications;
  } catch (err) {
    logger.error(`sendAutoNotification failed: ${err.message}`);
    throw err;
  }
};

/**
 * 알림 설정 조회 (없으면 생성)
 * @memberof Services.NotificationService
 * @function getOrCreateNotificationSetting
 *
 * @param {string} academyId - 아카데미 ID
 * @param {Object} user - 사용자 객체
 *
 * @returns {Promise<Object>} 알림 설정
 */
export const getOrCreateNotificationSetting = async (academyId, user) => {
  let setting = await NotificationSetting(academyId).findOne({ user: user._id });

  if (!setting) {
    setting = await NotificationSetting(academyId).create({
      user: user._id,
      userId: user.userId,
      userName: user.userName,
      settings: {
        classInvitation: true,
        classCancellation: true,
        classApproval: true,
        classApprovalCancel: true,
        scheduleStart: true,
        newPost: true,
        directMessage: true,
        soundEnabled: true,
        reminder: true,
        eventReminderDefault: 15,
      },
    });
  }

  return setting;
};
