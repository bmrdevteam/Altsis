/**
 * NotificationAPI namespace
 * @namespace APIs.NotificationAPI
 * @see TNotification in {@link Models.Notification}
 */
import { logger } from "../log/logger.js";
import { Notification } from "../models/index.js";
import { getOrCreateNotificationSetting } from "../services/notifications.js";
import {
  getVapidPublicKey,
  upsertPushSubscription,
  removePushSubscription,
  sendTestWebPush,
} from "../services/webPush.js";

import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

/**
 * @memberof APIs.NotificationAPI
 * @function *common
 *
 * @param {Object} req
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 404    | NOTIFICATION_NOT_FOUND | if notification is not found  |
 */

/**
 * @memberof APIs.NotificationAPI
 * @function RNotifications API
 * @description 알림 목록 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/notifications"} req.url
 *
 * @param {Object} req.query
 * @param {"received"|"sent"} req.query.type
 * @param {boolean?} req.query.checked
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Object[]} res.notifications
 *
 *
 */

/**
 * @memberof APIs.NotificationAPI
 * @function RNotification API
 * @description 알림 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/notifications/:_id"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Object} res.notification
 *
 *
 */
export const find = async (req, res) => {
  try {
    /* RNotification */
    if (req.params._id) {
      const notification = await Notification(req.user.academyId).findById(
        req.params._id
      );
      if (!notification) {
        return res.status(404).send({ message: __NOT_FOUND("notification") });
      }

      if (!notification.user._id.equals(req.user._id)) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
      return res.status(200).send({ notification });
    }

    /* RNotifications */
    if (!("type" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("type") });
    }
    const query = {
      user: req.user._id,
      type: req.query.type,
      notificationType: { $ne: "direct" },
    };
    if ("checked" in req.query) {
      query["checked"] = req.query.checked === "true";
    }

    const notifications = await Notification(req.user.academyId).find(query);

    return res.status(200).send({ notifications });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.NotificationAPI
 * @function UCheckNotification API
 * @description 알림 확인 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/notifications/:_id/check"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 *
 *
 */
export const check = async (req, res) => {
  try {
    const notification = await Notification(req.user.academyId).findById(
      req.params._id
    );
    if (!notification) {
      return res.status(404).send({ message: __NOT_FOUND("notification") });
    }

    if (!notification.user._id.equals(req.user._id)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // 휘발성 알림인 경우 삭제, 아니면 확인 표시
    if (notification.autoDeleteOnCheck) {
      await notification.deleteOne();
    } else {
      notification.checked = true;
      await notification.save();
    }

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.NotificationAPI
 * @function DNotification API
 * @description 알림 삭제 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/notifications/:_id"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 *
 *
 */
export const remove = async (req, res) => {
  try {
    const notification = await Notification(req.user.academyId).findById(
      req.params._id
    );
    if (!notification) {
      return res.status(404).send({ message: __NOT_FOUND("notification") });
    }

    if (!notification.user._id.equals(req.user._id)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }
    await notification.deleteOne();

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.NotificationAPI
 * @function UBulkCheckNotifications API
 * @description 알림 일괄 확인 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/notifications/bulk-check"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {number} res.checkedCount - 확인된 알림 수
 * @param {number} res.deletedCount - 삭제된 알림 수
 *
 */
export const bulkCheck = async (req, res) => {
  try {
    // 휘발성 알림은 삭제
    const deleteResult = await Notification(req.user.academyId).deleteMany({
      user: req.user._id,
      type: "received",
      checked: false,
      autoDeleteOnCheck: true,
    });

    // 비휘발성 알림은 확인 표시
    const updateResult = await Notification(req.user.academyId).updateMany(
      {
        user: req.user._id,
        type: "received",
        checked: false,
        autoDeleteOnCheck: { $ne: true },
      },
      { checked: true }
    );

    return res.status(200).send({
      deletedCount: deleteResult.deletedCount || 0,
      checkedCount: updateResult.modifiedCount || 0,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.NotificationAPI
 * @function RNotificationSettings API
 * @description 알림 설정 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/notifications/settings"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Object} res.settings - 알림 설정
 *
 */
export const getSettings = async (req, res) => {
  try {
    const setting = await getOrCreateNotificationSetting(
      req.user.academyId,
      req.user
    );

    return res.status(200).send({ settings: setting.settings });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.NotificationAPI
 * @function UNotificationSettings API
 * @description 알림 설정 수정 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/notifications/settings"} req.url
 *
 * @param {Object} req.body
 * @param {boolean?} req.body.classInvitation
 * @param {boolean?} req.body.classCancellation
 * @param {boolean?} req.body.classApproval
 * @param {boolean?} req.body.classApprovalCancel
 * @param {boolean?} req.body.scheduleStart
 * @param {boolean?} req.body.newPost
 * @param {boolean?} req.body.chatMessage
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Object} res.settings - 수정된 알림 설정
 *
 */
export const updateSettings = async (req, res) => {
  try {
    const setting = await getOrCreateNotificationSetting(
      req.user.academyId,
      req.user
    );

    const validSettings = [
      "classInvitation",
      "classCancellation",
      "classApproval",
      "classApprovalCancel",
      "scheduleStart",
      "newPost",
      "chatMessage",
      "soundEnabled",
      "reminder",
      "boardInvitation",
      "altFormApprovalRequest",
      "altFormApprovalResult",
      "eventReminderDefault",
      "webPushEnabled",
    ];

    for (let key of validSettings) {
      if (!(key in req.body) || req.body[key] === undefined || req.body[key] === null) {
        continue;
      }
      if (key === "eventReminderDefault") {
        const minutes = Number(req.body[key]);
        if (!Number.isFinite(minutes) || minutes < 0) {
          return res.status(400).send({ message: "INVALID_EVENT_REMINDER_DEFAULT" });
        }
        setting.settings[key] = minutes;
      } else if (typeof req.body[key] !== "boolean") {
        return res.status(400).send({ message: "INVALID_SETTING_VALUE" });
      } else {
        setting.settings[key] = req.body[key];
      }
    }

    await setting.save();

    return res.status(200).send({ settings: setting.settings });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.NotificationAPI
 * @function RVapidPublicKey API
 * @description Web Push VAPID 공개키 조회
 */
export const getVapidKey = async (req, res) => {
  try {
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
      return res.status(503).send({ message: "WEB_PUSH_NOT_CONFIGURED" });
    }
    return res.status(200).send({ publicKey });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.NotificationAPI
 * @function CPushSubscription API
 * @description Web Push 구독 등록
 */
export const subscribePush = async (req, res) => {
  try {
    if (!req.body?.endpoint || !req.body?.keys) {
      return res.status(400).send({ message: FIELD_REQUIRED("subscription") });
    }
    if (
      typeof req.body.endpoint !== "string" ||
      typeof req.body.keys?.p256dh !== "string" ||
      typeof req.body.keys?.auth !== "string"
    ) {
      return res.status(400).send({ message: "INVALID_SUBSCRIPTION" });
    }

    await upsertPushSubscription(
      req.user.academyId,
      req.user,
      {
        endpoint: req.body.endpoint,
        keys: req.body.keys,
        expirationTime: req.body.expirationTime ?? null,
      },
      typeof req.headers["user-agent"] === "string"
        ? req.headers["user-agent"].slice(0, 512)
        : ""
    );

    return res.status(200).send({ success: true });
  } catch (err) {
    if (err.message === "INVALID_SUBSCRIPTION") {
      return res.status(400).send({ message: "INVALID_SUBSCRIPTION" });
    }
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.NotificationAPI
 * @function DPushSubscription API
 * @description Web Push 구독 해제
 */
export const unsubscribePush = async (req, res) => {
  try {
    await removePushSubscription(
      req.user.academyId,
      req.user,
      req.query?.endpoint || req.body?.endpoint
    );
    return res.status(200).send({ success: true });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.NotificationAPI
 * @function CTestPush API
 * @description Web Push 테스트 발송 (현재 기기 구독으로 즉시 1건)
 */
export const testPush = async (req, res) => {
  try {
    const result = await sendTestWebPush(req.user.academyId, req.user);
    return res.status(200).send(result);
  } catch (err) {
    const code = err.message;
    if (
      [
        "WEB_PUSH_NOT_CONFIGURED",
        "WEB_PUSH_DISABLED",
        "NO_PUSH_SUBSCRIPTION",
        "CLIENT_URL_MISSING",
        "WEB_PUSH_SEND_FAILED",
      ].includes(code)
    ) {
      const status = code === "WEB_PUSH_NOT_CONFIGURED" ? 503 : 400;
      return res.status(status).send({ message: code });
    }
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
