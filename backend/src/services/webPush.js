/**
 * Web Push Service
 * @namespace Services.WebPushService
 */
import webpush from "web-push";
import {
  AltSheetRow,
  Board,
  ChatMessage,
  ChatRoom,
  Enrollment,
  Notification,
  NotificationSetting,
  Post,
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
  "chatMessage",
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

const clientOrigin = () => {
  const url = process.env["URL"]?.trim();
  if (!url) return null;
  return url.replace(/\/$/, "");
};

const resolveSchoolId = async (academyId, userObjectId) => {
  const user = await User(academyId)
    .findById(userObjectId)
    .select("schools")
    .lean();
  return user?.schools?.[0]?.schoolId || null;
};

const trimSchoolId = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : "";

/**
 * Entity school wins; user first-school is fallback only.
 * @param {string|null|undefined} entitySchoolId
 * @param {string|null|undefined} fallbackSchoolId
 * @returns {string|null}
 */
export const pickClickSchoolId = (entitySchoolId, fallbackSchoolId) => {
  return trimSchoolId(entitySchoolId) || trimSchoolId(fallbackSchoolId) || null;
};

/**
 * School slug of the board tied to the notification (not the user's first school).
 * @param {string} academyId
 * @param {object} notification
 * @returns {Promise<string|null>}
 */
export const resolveNotificationSchoolId = async (academyId, notification) => {
  const entity = notification?.relatedEntity;
  if (!entity?.type || !entity?.id) return null;

  try {
    let boardId = null;
    if (entity.type === "board") {
      boardId = entity.id;
    } else if (entity.type === "post") {
      const post = await Post(academyId)
        .findById(entity.id)
        .select("board")
        .lean();
      boardId = post?.board || null;
    } else if (entity.type === "altSheetRow") {
      const row = await AltSheetRow(academyId)
        .findById(entity.id)
        .select("board")
        .lean();
      boardId = row?.board || null;
    }
    if (!boardId) return null;

    const board = await Board(academyId)
      .findById(boardId)
      .select("schoolId")
      .lean();
    return trimSchoolId(board?.schoolId) || null;
  } catch (err) {
    logger.warn(`resolveNotificationSchoolId failed: ${err.message}`);
    return null;
  }
};

/**
 * relatedEntity → 앱 내 경로 (academy/school prefix 제외)
 * 인앱 벨 알림 클릭 경로와 최대한 동일하게 맞춘다.
 */
export const resolveNotificationPath = async (academyId, notification) => {
  const entity = notification?.relatedEntity;
  const type = notification?.notificationType;
  if (!entity?.type || !entity?.id) {
    return "/";
  }

  try {
    switch (entity.type) {
      case "enrollment": {
        const enrollment = await Enrollment(academyId)
          .findById(entity.id)
          .select("syllabus")
          .lean();
        if (enrollment?.syllabus) {
          return `/courses/enrolled/${enrollment.syllabus}`;
        }
        return "/courses";
      }
      case "syllabus": {
        if (type === "classCancellation") return "/courses";
        if (type === "classApproval" || type === "classApprovalCancel") {
          return `/courses/created/${entity.id}`;
        }
        return `/courses/${entity.id}`;
      }
      case "post": {
        const post = await Post(academyId)
          .findById(entity.id)
          .select("board")
          .lean();
        if (post?.board) {
          return `/boards/${post.board}/post/${entity.id}`;
        }
        return "/boards";
      }
      case "board":
        return `/boards/${entity.id}`;
      case "altSheetRow": {
        const row = await AltSheetRow(academyId)
          .findById(entity.id)
          .select("board form")
          .lean();
        if (row?.board) {
          const rowId = encodeURIComponent(String(entity.id));
          const formId = row.form ? encodeURIComponent(String(row.form)) : "";
          if (formId) {
            return `/boards/${row.board}?sheet=${formId}&row=${rowId}#활동`;
          }
          return `/boards/${row.board}?approval=${rowId}#활동`;
        }
        return "/boards";
      }
      case "altForm":
        return "/boards";
      case "calendarEvent":
      case "reminder":
        return "/";
      default:
        return "/";
    }
  } catch (err) {
    logger.warn(`resolveNotificationPath failed: ${err.message}`);
    return "/";
  }
};

/**
 * 알림 리스트가 과도하게 쌓이지 않도록 엔티티/유형 단위로 tag 통일
 */
export const tagForNotification = (notification) => {
  const type = notification?.notificationType || "notification";
  const entity = notification?.relatedEntity;
  if (entity?.type && entity?.id) {
    return `${type}:${entity.type}:${entity.id}`;
  }
  return `${type}:${notification?._id || "unknown"}`;
};

const appendQuery = (path, key, value) => {
  if (!value) return path;
  const hashIndex = path.indexOf("#");
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const sep = withoutHash.includes("?") ? "&" : "?";
  return `${withoutHash}${sep}${key}=${encodeURIComponent(String(value))}${hash}`;
};

export const buildClickUrl = async (academyId, schoolId, notification) => {
  const origin = clientOrigin();
  if (!origin) return null;
  if (!schoolId) return `${origin}/`;

  let path = await resolveNotificationPath(academyId, notification);
  path = appendQuery(path, "openNotification", notification?._id);
  return `${origin}/${academyId}/${schoolId}${path}`;
};

const buildChatClickUrl = (academyId, schoolId, roomId) => {
  const origin = clientOrigin();
  if (!origin) return null;
  if (!schoolId) {
    return `${origin}/?chatRoom=${encodeURIComponent(String(roomId))}`;
  }
  return `${origin}/${academyId}/${schoolId}/?chatRoom=${encodeURIComponent(
    String(roomId)
  )}`;
};

const buildBoardChatClickUrl = (academyId, schoolId, boardId, roomId) => {
  const origin = clientOrigin();
  if (!origin || !schoolId || !boardId) return null;
  const tab = encodeURIComponent("채팅");
  return `${origin}/${academyId}/${schoolId}/boards/${boardId}?boardChatRoom=${encodeURIComponent(
    String(roomId)
  )}#${tab}`;
};

/**
 * 홈 화면 뱃지용: 미확인 알림 + 채팅 미읽음 합
 */
export const getAppBadgeCount = async (academyId, userObjectId) => {
  const userId = String(userObjectId);
  const [notificationCount, rooms] = await Promise.all([
    Notification(academyId).countDocuments({
      user: userObjectId,
      type: "received",
      checked: false,
      notificationType: { $ne: "direct" },
    }),
    ChatRoom(academyId)
      .find({
        "participants.user": userObjectId,
        isActive: true,
        // 보드 방은 개수가 많아 뱃지 집계·푸시 지연을 유발할 수 있어 제외
        type: { $ne: "board" },
      })
      .select("participants")
      .lean(),
  ]);

  const chatCounts = await Promise.all(
    rooms.map(async (room) => {
      const participant = room.participants?.find(
        (p) => String(p.user) === userId
      );
      if (participant?.isArchived) return 0;
      const query = {
        room: room._id,
        sender: { $ne: userObjectId },
        isDeleted: false,
      };
      if (participant?.lastReadAt) {
        query.createdAt = { $gt: participant.lastReadAt };
      }
      return ChatMessage(academyId).countDocuments(query);
    })
  );

  const chatUnread = chatCounts.reduce((sum, n) => sum + n, 0);
  return notificationCount + chatUnread;
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

  // 사용자별로 발송 대상 알림을 모은다 (배치 내 동일 사용자는 첫 알림 기준 URL)
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
      const entitySchoolId = await resolveNotificationSchoolId(
        academyId,
        notification
      );
      const fallbackSchoolId = await resolveSchoolId(
        academyId,
        notification.user
      );
      const schoolId = pickClickSchoolId(entitySchoolId, fallbackSchoolId);
      const url = await buildClickUrl(academyId, schoolId, notification);
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

      let badgeCount;
      try {
        badgeCount = await getAppBadgeCount(academyId, notification.user);
      } catch (badgeErr) {
        logger.warn(
          `App badge count failed for ${notification.userId}: ${badgeErr.message}`
        );
      }
      const body =
        (notification.description && String(notification.description).trim()) ||
        "알림을 확인하려면 탭하세요.";
      const payload = JSON.stringify({
        title: notification.title || "Altsis",
        body,
        url,
        tag: tagForNotification(notification),
        notificationType: notification.notificationType,
        ...(badgeCount != null ? { badgeCount } : {}),
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
 * 채팅 메시지 Web Push (Notification DB 없이 구독자에게 직접 발송)
 * @param {Object} params
 * @param {string} params.academyId
 * @param {Array<{user: *, userId: string}>} params.recipients
 * @param {string} params.title
 * @param {string} params.body
 * @param {string} [params.roomId]
 * @param {string} [params.boardId] - 보드 채팅이면 보드 딥링크 사용
 * @param {string} [params.schoolId] - 보드의 schoolId (있으면 수신자 school 조회 생략)
 */
export const sendChatWebPushes = async ({
  academyId,
  recipients,
  title,
  body,
  roomId,
  boardId,
  schoolId: boardSchoolId,
}) => {
  if (!ensureConfigured()) {
    return { sent: 0 };
  }

  const origin = clientOrigin();
  if (!origin || !recipients?.length) {
    return { sent: 0 };
  }

  const userObjectIds = [
    ...new Set(
      recipients
        .map((r) => (r.user?._id ? String(r.user._id) : String(r.user)))
        .filter((id) => id && id !== "undefined")
    ),
  ];
  if (userObjectIds.length === 0) return { sent: 0 };

  const settingDocs = await NotificationSetting(academyId)
    .find({ user: { $in: userObjectIds } })
    .select("user userId settings")
    .lean();
  const settingsByUser = {};
  for (const doc of settingDocs) {
    settingsByUser[String(doc.user)] = doc.settings || {};
  }

  let totalSent = 0;
  for (const recipient of recipients) {
    const userKey = recipient.user?._id
      ? String(recipient.user._id)
      : String(recipient.user);
    const settings = settingsByUser[userKey] || {};
    if (!settings.webPushEnabled) continue;
    if (settings.chatMessage === false) continue;

    try {
      const schoolId =
        boardSchoolId || (await resolveSchoolId(academyId, userKey));
      // 보드 딥링크 실패 시에도 푸시는 보내도록 DM 클릭 URL로 폴백
      const url = boardId
        ? buildBoardChatClickUrl(academyId, schoolId, boardId, roomId) ||
          buildChatClickUrl(academyId, schoolId, roomId)
        : buildChatClickUrl(academyId, schoolId, roomId);
      if (!url) continue;

      const subs = await PushSubscription(academyId).find({
        user: userKey,
      });
      if (subs.length === 0) continue;

      let badgeCount;
      try {
        badgeCount = await getAppBadgeCount(academyId, userKey);
      } catch (badgeErr) {
        logger.warn(
          `App badge count failed for ${recipient.userId || userKey}: ${badgeErr.message}`
        );
      }
      const payload = JSON.stringify({
        title: title || "새 메시지",
        body: (body && String(body).trim()) || "새 채팅 메시지가 있습니다.",
        url,
        tag: `chatMessage:${boardId ? `board:${boardId}:` : ""}${
          roomId || userKey
        }`,
        notificationType: "chatMessage",
        ...(badgeCount != null ? { badgeCount } : {}),
      });

      const sent = await sendToSubscriptions(
        academyId,
        subs,
        payload,
        recipient.userId || userKey
      );
      totalSent += sent;
    } catch (err) {
      logger.warn(
        `Chat Web Push failed for ${recipient.userId || userKey}: ${err.message}`
      );
    }
  }

  if (totalSent > 0) {
    logger.info(`Chat Web Push sent ${totalSent} notification(s)`);
  }
  return { sent: totalSent };
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

  const badgeCount = await getAppBadgeCount(academyId, user._id);
  const payload = JSON.stringify({
    title: "Altsis 테스트 알림",
    body: "잠금화면 알림이 정상적으로 설정되었습니다.",
    url,
    tag: `test:${Date.now()}`,
    notificationType: "reminder",
    badgeCount: Math.max(badgeCount, 1),
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
