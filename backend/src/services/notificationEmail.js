/**
 * Academy SMTP email notifications (opt-in, extra channel after in-app).
 * @namespace Services.NotificationEmailService
 */
import nodemailer from "nodemailer";
import {
  Academy,
  AltForm,
  AltSheetRow,
  Board,
  NotificationSetting,
  User,
} from "../models/index.js";
import { logger } from "../log/logger.js";
import { validate } from "../utils/validate.js";
import { buildClickUrl } from "./webPush.js";

/** Admin may enable these for email. newPost / chatMessage / scheduleStart never mail. */
export const EMAIL_ELIGIBLE_TYPES = new Set([
  "classInvitation",
  "classCancellation",
  "classApproval",
  "classApprovalCancel",
  "boardInvitation",
  "altFormApprovalRequest",
  "altFormApprovalResult",
  "reminder",
]);

export const DEFAULT_EMAIL_NOTIFY_TYPES = {
  classInvitation: true,
  classCancellation: true,
  classApproval: true,
  classApprovalCancel: true,
  boardInvitation: true,
  altFormApprovalRequest: true,
  altFormApprovalResult: true,
  reminder: true,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Profile email, else Google SNS email.
 * @param {object} user
 * @returns {string|null}
 */
export const resolveRecipientEmail = (user) => {
  const profile = typeof user?.email === "string" ? user.email.trim() : "";
  if (profile && EMAIL_PATTERN.test(profile) && validate("email", profile)) {
    return profile;
  }
  const google =
    typeof user?.snsId?.google === "string" ? user.snsId.google.trim() : "";
  if (google && EMAIL_PATTERN.test(google)) {
    return google;
  }
  return null;
};

/**
 * @param {object|null|undefined} smtp
 * @returns {boolean}
 */
export const isSmtpConfigured = (smtp) => {
  if (!smtp || typeof smtp !== "object") return false;
  const host = typeof smtp.host === "string" ? smtp.host.trim() : "";
  const user = typeof smtp.user === "string" ? smtp.user.trim() : "";
  const pass = typeof smtp.pass === "string" ? smtp.pass : "";
  return Boolean(host && user && pass);
};

/**
 * Server-cap + academy admin whitelist. Unknown / never-mail types are false.
 * Missing academy key defaults to ON for eligible types.
 * @param {string} notificationType
 * @param {object|null|undefined} academyTypes
 * @returns {boolean}
 */
export const isEmailTypeAllowed = (notificationType, academyTypes) => {
  if (!EMAIL_ELIGIBLE_TYPES.has(notificationType)) return false;
  if (!academyTypes || typeof academyTypes !== "object") return true;
  if (academyTypes[notificationType] === false) return false;
  return true;
};

/**
 * Normalize admin whitelist to the 8 eligible keys (booleans).
 * @param {object|null|undefined} raw
 * @returns {typeof DEFAULT_EMAIL_NOTIFY_TYPES}
 */
export const normalizeEmailNotifyTypes = (raw) => {
  const next = { ...DEFAULT_EMAIL_NOTIFY_TYPES };
  if (!raw || typeof raw !== "object") return next;
  for (const key of EMAIL_ELIGIBLE_TYPES) {
    if (typeof raw[key] === "boolean") {
      next[key] = raw[key];
    }
  }
  return next;
};

/**
 * All send gates except "already an in-app notification".
 * @returns {boolean}
 */
export const shouldSendNotificationEmail = ({
  emailNotifyEnabled,
  smtp,
  emailEnabled,
  recipientEmail,
  notificationType,
  academyTypes,
  userTypeEnabled,
}) => {
  if (emailNotifyEnabled !== true) return false;
  if (!isSmtpConfigured(smtp)) return false;
  if (emailEnabled !== true) return false;
  if (!recipientEmail) return false;
  if (!isEmailTypeAllowed(notificationType, academyTypes)) return false;
  if (userTypeEnabled === false) return false;
  return true;
};

export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const trimLabel = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * School / board / form labels for the email card (omit empty).
 * @param {{ schoolName?: string, boardName?: string, formTitle?: string }|null|undefined} context
 * @returns {{ label: string, value: string }[]}
 */
export const normalizeEmailContext = (context) => {
  if (!context || typeof context !== "object") return [];
  const rows = [
    { label: "학교", value: trimLabel(context.schoolName) },
    { label: "보드", value: trimLabel(context.boardName) },
    { label: "양식", value: trimLabel(context.formTitle) },
  ];
  return rows.filter((row) => row.value);
};

/**
 * @param {{ schoolName?: string, boardName?: string, formTitle?: string }|null|undefined} context
 * @returns {string}
 */
export const formatEmailContextLine = (context) =>
  normalizeEmailContext(context)
    .map((row) => row.value)
    .join(" · ");

/**
 * Subject + text fallback + table-based HTML card.
 * @returns {{ subject: string, text: string, html: string }}
 */
export const buildNotificationEmail = ({
  title,
  description = "",
  url = "",
  category = "",
  context,
} = {}) => {
  const subject = String(title || "알림").trim() || "알림";
  const desc = typeof description === "string" ? description.trim() : "";
  const contextRows = normalizeEmailContext(context);
  const textLines = [subject];
  if (contextRows.length) {
    textLines.push("");
    for (const row of contextRows) {
      textLines.push(`${row.label}: ${row.value}`);
    }
  }
  if (desc) textLines.push("", desc);
  if (url) textLines.push("", url);

  const badge = escapeHtml(category || "알림");
  const safeTitle = escapeHtml(subject);
  const safeDesc = desc
    ? escapeHtml(desc).replace(/\n/g, "<br>")
    : "";
  const safeUrl = escapeHtml(url);
  const contextHtml = contextRows.length
    ? `<tr><td style="padding:10px 28px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:20px;">
          ${contextRows
            .map(
              (row) =>
                `<tr>
            <td style="padding:2px 12px 2px 0;white-space:nowrap;color:#9ca3af;">${escapeHtml(row.label)}</td>
            <td style="padding:2px 0;color:#374151;">${escapeHtml(row.value)}</td>
          </tr>`
            )
            .join("")}
        </table>
      </td></tr>`
    : "";
  const button = url
    ? `<tr><td style="padding:24px 28px 8px;">
        <a href="${safeUrl}" style="display:inline-block;background:#1f4fd3;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:6px;">앱에서 열기</a>
      </td></tr>
      <tr><td style="padding:0 28px 8px;font-size:12px;line-height:18px;color:#6b7280;word-break:break-all;">${safeUrl}</td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="ko">
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#1f4fd3;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:0.02em;padding:10px 28px;">${badge}</td>
          </tr>
          <tr>
            <td style="padding:22px 28px 0;font-size:20px;line-height:28px;font-weight:700;color:#111827;">${safeTitle}</td>
          </tr>
          ${contextHtml}
          ${
            safeDesc
              ? `<tr><td style="padding:12px 28px 0;font-size:14px;line-height:22px;color:#374151;">${safeDesc}</td></tr>`
              : ""
          }
          ${button}
          <tr>
            <td style="padding:20px 28px 24px;font-size:12px;line-height:18px;color:#9ca3af;">이 메일은 Altsis 알림입니다. 수신은 앱 설정에서 바꿀 수 있습니다.</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text: textLines.join("\n"), html };
};

export const createTransporter = (smtp) => {
  const port = Number(smtp.port) || 587;
  return nodemailer.createTransport({
    host: String(smtp.host).trim(),
    port,
    secure: smtp.secure === true,
    auth: {
      user: String(smtp.user).trim(),
      pass: String(smtp.pass),
    },
  });
};

const fromAddress = (smtp) => {
  const from = typeof smtp.from === "string" ? smtp.from.trim() : "";
  if (from) return from;
  return String(smtp.user).trim();
};

const sendMail = async (smtp, { to, subject, text, html }) => {
  const transporter = createTransporter(smtp);
  await transporter.sendMail({
    from: fromAddress(smtp),
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });
};

const loadAcademySmtp = async (academyId) => {
  return Academy.findOne({ academyId }).select("+emailSmtp").lean();
};

/**
 * Owner-allowed + SMTP present. Used by admin/user test endpoints.
 * @returns {{ academy: object, smtp: object }}
 */
export const requireAcademyEmailReady = async (academyId) => {
  const academy = await loadAcademySmtp(academyId);
  if (!academy) {
    const err = new Error("ACADEMY_NOT_FOUND");
    throw err;
  }
  if (academy.emailNotifyEnabled !== true) {
    throw new Error("EMAIL_NOTIFY_DISABLED");
  }
  if (!isSmtpConfigured(academy.emailSmtp)) {
    throw new Error("EMAIL_SMTP_NOT_CONFIGURED");
  }
  return { academy, smtp: academy.emailSmtp };
};

export const sendTestEmailToAddress = async (academyId, toEmail) => {
  const { smtp } = await requireAcademyEmailReady(academyId);
  if (!toEmail || !EMAIL_PATTERN.test(toEmail)) {
    throw new Error("EMAIL_ADDRESS_MISSING");
  }
  const built = buildNotificationEmail({
    title: "[Altsis] 이메일 알림 테스트",
    description: "아카데미 이메일 알림이 정상적으로 설정되었습니다. 이 메일은 테스트 발송입니다.",
    category: "테스트",
  });
  await sendMail(smtp, {
    to: toEmail,
    ...built,
  });
  return { sent: true };
};

/**
 * Batch school / board / form names for altSheetRow emails.
 * @param {string} academyId
 * @param {Array} notifications
 * @returns {Promise<Record<string, { schoolName?: string, boardName?: string, formTitle?: string }>>}
 */
export const loadAltSheetEmailContexts = async (academyId, notifications) => {
  try {
    const rowIds = [
      ...new Set(
        (notifications || [])
          .filter(
            (n) => n?.relatedEntity?.type === "altSheetRow" && n.relatedEntity.id
          )
          .map((n) => String(n.relatedEntity.id))
      ),
    ];
    if (rowIds.length === 0) return {};

    const rows = await AltSheetRow(academyId)
      .find({ _id: { $in: rowIds } })
      .select("board form")
      .lean();
    const formIds = [
      ...new Set(
        rows.map((row) => row.form && String(row.form)).filter(Boolean)
      ),
    ];
    const boardIds = [
      ...new Set(
        rows.map((row) => row.board && String(row.board)).filter(Boolean)
      ),
    ];
    const [forms, boards] = await Promise.all([
      formIds.length
        ? AltForm(academyId)
            .find({ _id: { $in: formIds } })
            .select("title")
            .lean()
        : [],
      boardIds.length
        ? Board(academyId)
            .find({ _id: { $in: boardIds } })
            .select("name schoolName")
            .lean()
        : [],
    ]);

    const formById = {};
    for (const form of forms) {
      formById[String(form._id)] = form;
    }
    const boardById = {};
    for (const board of boards) {
      boardById[String(board._id)] = board;
    }
    const contextByRowId = {};
    for (const row of rows) {
      const form = row.form ? formById[String(row.form)] : null;
      const board = row.board ? boardById[String(row.board)] : null;
      contextByRowId[String(row._id)] = {
        schoolName: trimLabel(board?.schoolName),
        boardName: trimLabel(board?.name),
        formTitle: trimLabel(form?.title),
      };
    }
    return contextByRowId;
  } catch (err) {
    logger.warn(`loadAltSheetEmailContexts failed: ${err.message}`);
    return {};
  }
};

/**
 * In-app 알림 뒤에 붙는 부가 채널. 실패해도 호출측에서 catch.
 */
export const sendNotificationEmails = async ({
  academyId,
  notifications,
  settingsByUserId = {},
}) => {
  if (!notifications?.length) return { sent: 0 };

  const academy = await loadAcademySmtp(academyId);
  if (!academy || academy.emailNotifyEnabled !== true) return { sent: 0 };
  if (!isSmtpConfigured(academy.emailSmtp)) return { sent: 0 };

  const academyTypes = normalizeEmailNotifyTypes(academy.emailNotifyTypes);
  const eligible = notifications.filter((n) =>
    EMAIL_ELIGIBLE_TYPES.has(n.notificationType)
  );
  if (eligible.length === 0) return { sent: 0 };

  const userObjectIds = [
    ...new Set(eligible.map((n) => String(n.user)).filter(Boolean)),
  ];
  const [users, settingDocs, contextByRowId] = await Promise.all([
    User(academyId)
      .find({ _id: { $in: userObjectIds } })
      .select("email snsId schools userId")
      .lean(),
    NotificationSetting(academyId)
      .find({ user: { $in: userObjectIds } })
      .select("user userId settings")
      .lean(),
    loadAltSheetEmailContexts(academyId, eligible),
  ]);

  const userById = {};
  for (const user of users) {
    userById[String(user._id)] = user;
  }
  const settingsByUserObjectId = {};
  for (const doc of settingDocs) {
    settingsByUserObjectId[String(doc.user)] = doc.settings || {};
  }

  let sent = 0;
  for (const notification of eligible) {
    const userKey = String(notification.user);
    const user = userById[userKey];
    const settings =
      settingsByUserObjectId[userKey] ||
      settingsByUserId[notification.userId] ||
      {};
    const recipientEmail = resolveRecipientEmail(user);
    if (
      !shouldSendNotificationEmail({
        emailNotifyEnabled: true,
        smtp: academy.emailSmtp,
        emailEnabled: settings.emailEnabled === true,
        recipientEmail,
        notificationType: notification.notificationType,
        academyTypes,
        userTypeEnabled: settings[notification.notificationType],
      })
    ) {
      continue;
    }

    try {
      const schoolId = user?.schools?.[0]?.schoolId || null;
      const url = await buildClickUrl(academyId, schoolId, notification);
      const rowId =
        notification.relatedEntity?.type === "altSheetRow" &&
        notification.relatedEntity.id
          ? String(notification.relatedEntity.id)
          : "";
      const built = buildNotificationEmail({
        title: notification.title || "알림",
        description:
          typeof notification.description === "string"
            ? notification.description
            : "",
        url,
        category: notification.category || "",
        context: rowId ? contextByRowId[rowId] : undefined,
      });
      await sendMail(academy.emailSmtp, {
        to: recipientEmail,
        ...built,
      });
      sent += 1;
    } catch (err) {
      logger.warn(
        `notification email failed for ${notification.userId}: ${err.message}`
      );
    }
  }

  return { sent };
};
