/**
 * NotificationAPI namespace
 * @namespace APIs.NotificationAPI
 * @see TNotification in {@link Models.Notification}
 */
import { logger } from "../log/logger.js";
import _ from "lodash";
import { Notification, NotificationSetting, Registration } from "../models/index.js";
import { getOrCreateNotificationSetting } from "../services/notifications.js";
import { client } from "../_database/redis/index.js";
import { getIoNotification } from "../utils/webSocket.js";

import mongoose from "mongoose";
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
 * @function CNotification API
 * @description 알림 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/notifications"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} req.body
 * @param {Object[]} req.body.toUserList
 * @param {string} req.body.toUserList[i].user - objectId of user
 * @param {string} req.body.toUserList[i].userId
 * @param {string} req.body.toUserList[i].userName
 * @param {string?} req.body.category
 * @param {string} req.body.title
 * @param {string} req.body.description
 *
 * @param {Object} res
 * @param {Object[]} res.notifications - created notifications
 *
 *
 */
export const send = async (req, res) => {
  try {
    // 권한 체크: admin/manager는 허용, 그 외는 teacher만 허용
    if (req.user.auth !== "admin" && req.user.auth !== "manager") {
      const teacherReg = await Registration(req.user.academyId).findOne({
        user: req.user._id,
        role: "teacher",
        isActivated: true,
      });
      if (!teacherReg) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
    }

    for (let field of ["toUserList", "title", "description"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }
    for (let user of req.body.toUserList) {
      for (let field of ["user", "userId", "userName"]) {
        if (!(field in user)) {
          return res.status(400).send({ message: FIELD_REQUIRED(field) });
        }
      }
    }

    // received notifications
    const notifications = req.body.toUserList.map((user) => ({
      type: "received",
      user: user.user,
      userId: user.userId,
      userName: user.userName,
      checked: false,
      fromUser: req.user._id,
      fromUserId: req.user.userId,
      fromUserName: req.user.userName,
      category: req.body.category,
      title: req.body.title,
      description: req.body.description,
    }));

    // sent notifications
    notifications.push({
      type: "sent",
      user: req.user._id,
      userId: req.user.userId,
      userName: req.user.userName,
      toUserList: req.body.toUserList,
      category: req.body.category,
      title: req.body.title,
      description: req.body.description,
    });

    const newNotifications = await Notification(req.user.academyId).insertMany(
      notifications
    );

    for (let notification of _.filter(newNotifications, { type: "received" })) {
      const data = await client.v4.hGet(
        "io/notification/user-sidList",
        `${req.user.academyId}/${notification.userId}`
      );
      if (data) {
        JSON.parse(data).sid?.forEach((sid) => {
          getIoNotification().to(sid).emit("listen", "update notifications");
        });
      }
    }

    return res.status(200).send({ notifications: newNotifications });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

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
    };
    if ("checked" in req.query) {
      query["checked"] = req.query.checked === "true";
    }

    const notifications = await Notification(req.user.academyId)
      .find(query)
      .select("-description");

    return res.status(200).send({ notifications });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
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
    return res.status(500).send({ message: err.message });
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
    return res.status(500).send({ message: err.message });
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
    return res.status(500).send({ message: err.message });
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
    return res.status(500).send({ message: err.message });
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
 * @param {boolean?} req.body.directMessage
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
      "directMessage",
    ];

    for (let key of validSettings) {
      if (key in req.body) {
        setting.settings[key] = req.body[key];
      }
    }

    await setting.save();

    return res.status(200).send({ settings: setting.settings });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
