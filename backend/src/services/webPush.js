/**
 * Web Push Service
 * @namespace Services.WebPushService
 */
import webpush from "web-push";
import { PushSubscription, User } from "../models/index.js";
import { logger } from "../log/logger.js";

/** MVP에서 잠금화면 푸시를 허용하는 알림 유형 (옵트인 후) */
export const WEB_PUSH_ELIGIBLE_TYPES = new Set([
  "classInvitation",
  "altFormApprovalRequest",
  "reminder",
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

/**
 * 생성된 알림들에 대해 Web Push 발송
 * @param {Object} params
 * @param {string} params.academyId
 * @param {Array} params.notifications - insertMany 결과
 * @param {Object} params.settingsByUserId - userId → settings
 */
export const sendWebPushesForNotifications = async ({
  academyId,
  notifications,
  settingsByUserId,
}) => {
  if (!ensureConfigured()) {
    return;
  }

  const origin = clientOrigin();
  if (!origin) {
    logger.warn("Web Push skipped: URL env is not set");
    return;
  }

  const eligible = notifications.filter((n) =>
    WEB_PUSH_ELIGIBLE_TYPES.has(n.notificationType)
  );
  if (eligible.length === 0) return;

  // userId별 대표 알림 (동일 사용자 다건이면 첫 건)
  const byUserId = new Map();
  for (const n of eligible) {
    const settings = settingsByUserId[n.userId];
    if (!settings?.webPushEnabled) continue;
    // 유형별 인앱 옵트아웃과 동일 기준
    if (settings[n.notificationType] === false) continue;
    if (!byUserId.has(n.userId)) {
      byUserId.set(n.userId, n);
    }
  }

  for (const [userId, notification] of byUserId) {
    try {
      const schoolId = await resolveSchoolId(academyId, notification.user);
      if (!schoolId) continue;

      const subs = await PushSubscription(academyId).find({
        user: notification.user,
      });
      if (subs.length === 0) continue;

      const path = pathForNotification(notification);
      const url = `${origin}/${academyId}/${schoolId}${path === "/" ? "/" : path}`;
      const payload = JSON.stringify({
        title: notification.title || "Altsis",
        body: notification.description || "",
        url,
        tag: `${notification.notificationType}:${notification._id}`,
        notificationType: notification.notificationType,
      });

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
    } catch (err) {
      logger.warn(`Web Push batch failed for ${userId}: ${err.message}`);
    }
  }
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
