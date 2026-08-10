/**
 * Web Push Service
 * @namespace Services.WebPushService
 */
import webpush from "web-push";
import {
  NotificationSetting,
  PushSubscription,
  User,
} from "../models/index.js";
import { logger } from "../log/logger.js";

/**
 * 잠금화면 Web Push 대상 = 인앱 자동 알림과 동일한 유형.
 * webPushEnabled + 유형별 설정이 ON인 경우에만 발송한다.
 */
export const WEB_PUSH_ELIGIBLE_TYPES = new Set([
  "classInvitation",
  "classCancellation",
  "classApproval",
  "classApprovalCancel",
  "scheduleStart",
  "newPost",
  "reminder",
  "boardInvitation",
  "altFormApprovalRequest",
  "altFormApprovalResult",
]);

let configured = false;

const ensureConfigured = () => {
  if (configured) return true;
  const publicKey = process.env["VAPID_PUBLIC_KEY"]?.trim();
  const privateKey = process.env["VAPID_PRIVATE_KEY"]?.trim();
  const subject =
    process.env["VAPID_SUBJECT"]?.trim() || "mailto:admin@altsis.local";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
};

/**
 * VAPID 공개키 (프론트 구독용)
 */
export const getVapidPublicKey = () => {
  return process.env["VAPID_PUBLIC_KEY"]?.trim() || null;
};

/**
 * relatedEntity → 앱 내 경로 (academy/school prefix 제외)
 */
const pathForNotification = (notification) => {
  const entity = notification.relatedEntity;
  if (!entity?.type) return "/";

  switch (entity.type) {
    case "enrollment":
      return "/courses";
    case "syllabus":
      return `/courses/${entity.id}`;
    case "post":
      return "/boards";
    case "board":
      return `/boards/${entity.id}`;
    case "altSheetRow":
    case "altForm":
      return "/boards";
    case "calendarEvent":
    case "reminder":
      return "/";
    default:
      return "/";
  }
};

const resolveSchoolId = async (academyId, userObjectId) => {
  const user = await User(academyId)
    .findById(userObjectId)
    .select("schools")
    .lean();
  return user?.schools?.[0]?.schoolId || null;
};

const clientOrigin = () => {
  const url = process.env["URL"]?.trim();
  if (!url) return null;
  return url.replace(/\/$/, "");
};

const buildClickUrl = (academyId, schoolId, notification) => {
  const origin = clientOrigin();
  if (!origin) return null;
  const path = pathForNotification(notification);
  if (!schoolId) {
    return `${origin}/`;
  }
  return `${origin}/${academyId}/${schoolId}${path === "/" ? "/" : path}`;
};

const sendToSubscriptions = async (academyId, subs, payload, userId) => {
  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payload
        );
        sent += 1;
      } catch (err) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          await PushSubscription(academyId).deleteOne({ _id: sub._id });
          logger.info(`Removed stale push subscription ${sub._id}`);
        } else {
          logger.warn(
            `Web Push failed for ${userId}: ${err?.message || err}`
          );
        }
      }
    })
  );
  return sent;
};

/**
 * 생성된 알림들에 대해 Web Push 발송
 * @param {Object} params
 * @param {string} params.academyId
 * @param {Array} params.notifications - insertMany 결과
 * @param {Object} params.settingsByUserId - userId → settings (보조)
 */
export const sendWebPushesForNotifications = async ({
  academyId,
  notifications,
  settingsByUserId = {},
}) => {
  if (!ensureConfigured()) {
    logger.warn("Web Push skipped: VAPID is not configured");
    return;
  }

  if (!clientOrigin()) {
    logger.warn("Web Push skipped: URL env is not set");
    return;
  }

  const eligible = notifications.filter((n) =>
    WEB_PUSH_ELIGIBLE_TYPES.has(n.notificationType)
  );
  if (eligible.length === 0) return;

  // user ObjectId 기준으로 설정을 다시 조회 (webPushEnabled 누락 방지)
  const userObjectIds = [
    ...new Set(eligible.map((n) => String(n.user)).filter(Boolean)),
  ];
  const settingDocs = await NotificationSetting(academyId)
    .find({ user: { $in: userObjectIds } })
    .select("user userId settings")
    .lean();
  const settingsByUserObjectId = {};
  for (const doc of settingDocs) {
    settingsByUserObjectId[String(doc.user)] = doc.settings || {};
  }

  const byUserKey = new Map();
  for (const n of eligible) {
    const userKey = String(n.user);
    const settings =
      settingsByUserObjectId[userKey] ||
      settingsByUserId[n.userId] ||
      {};
    if (!settings.webPushEnabled) {
      logger.info(
        `Web Push skipped for ${n.userId}: webPushEnabled is off`
      );
      continue;
    }
    if (settings[n.notificationType] === false) {
      logger.info(
        `Web Push skipped for ${n.userId}: ${n.notificationType} opted out`
      );
      continue;
    }
    if (!byUserKey.has(userKey)) {
      byUserKey.set(userKey, n);
    }
  }

  for (const [userKey, notification] of byUserKey) {
    try {
      const schoolId = await resolveSchoolId(academyId, notification.user);
      const url = buildClickUrl(academyId, schoolId, notification);
      if (!url) continue;

      const subs = await PushSubscription(academyId).find({
        user: notification.user,
      });
      if (subs.length === 0) {
        logger.warn(
          `Web Push skipped for ${notification.userId}: no PushSubscription`
        );
        continue;
      }

      const body =
        (notification.description && String(notification.description).trim()) ||
        "알림을 확인하려면 탭하세요.";
      const payload = JSON.stringify({
        title: notification.title || "Altsis",
        body,
        url,
        tag: `${notification.notificationType}:${notification._id}`,
        notificationType: notification.notificationType,
      });

      const sent = await sendToSubscriptions(
        academyId,
        subs,
        payload,
        notification.userId
      );
      logger.info(
        `Web Push sent ${sent}/${subs.length} for ${notification.userId} (${notification.notificationType})`
      );
    } catch (err) {
      logger.warn(`Web Push batch failed for ${userKey}: ${err.message}`);
    }
  }
};

/**
 * 현재 사용자에게 테스트 푸시 1건 발송
 */
export const sendTestWebPush = async (academyId, user) => {
  if (!ensureConfigured()) {
    throw new Error("WEB_PUSH_NOT_CONFIGURED");
  }

  const setting = await NotificationSetting(academyId)
    .findOne({ user: user._id })
    .lean();
  if (!setting?.settings?.webPushEnabled) {
    throw new Error("WEB_PUSH_DISABLED");
  }

  const subs = await PushSubscription(academyId).find({ user: user._id });
  if (subs.length === 0) {
    throw new Error("NO_PUSH_SUBSCRIPTION");
  }

  const schoolId = await resolveSchoolId(academyId, user._id);
  const origin = clientOrigin();
  if (!origin) {
    throw new Error("CLIENT_URL_MISSING");
  }
  const url = schoolId
    ? `${origin}/${academyId}/${schoolId}/`
    : `${origin}/`;

  const payload = JSON.stringify({
    title: "Altsis 테스트 알림",
    body: "잠금화면 알림이 정상적으로 설정되었습니다.",
    url,
    tag: `test:${Date.now()}`,
    notificationType: "reminder",
  });

  const sent = await sendToSubscriptions(
    academyId,
    subs,
    payload,
    user.userId
  );
  if (sent === 0) {
    throw new Error("WEB_PUSH_SEND_FAILED");
  }
  return { sent, subscriptionCount: subs.length };
};

/**
 * 구독 저장 (endpoint upsert)
 */
export const upsertPushSubscription = async (
  academyId,
  user,
  subscription,
  userAgent = ""
) => {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error("INVALID_SUBSCRIPTION");
  }

  return PushSubscription(academyId).findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      user: user._id,
      userId: user.userId,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      expirationTime: subscription.expirationTime ?? null,
      userAgent: userAgent || "",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

/**
 * 구독 삭제
 */
export const removePushSubscription = async (academyId, user, endpoint) => {
  const query = { user: user._id };
  if (endpoint) {
    query.endpoint = endpoint;
  }
  return PushSubscription(academyId).deleteMany(query);
};
