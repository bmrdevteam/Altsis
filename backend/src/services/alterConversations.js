/**
 * Navbar Alter 대화 저장 서비스
 */
import mongoose from "mongoose";
import { AlterConversation } from "../models/AlterConversation.js";
import { AlterMessage } from "../models/AlterMessage.js";
import { Season } from "../models/index.js";
import {
  FIELD_REQUIRED,
  __NOT_FOUND,
} from "../messages/index.js";
import { signUrlForView } from "../_s3/fileBucket.js";
import { normalizeAlterGuideLinks } from "./alterGuideLinks.js";

const normalizeStoredAttachments = (attachments = []) =>
  (Array.isArray(attachments) ? attachments : [])
    .filter((a) => a && (a.kind === "text" || a.kind === "image"))
    .slice(0, 10)
    .map((a) => ({
      kind: a.kind,
      name: String(a.name || "첨부").slice(0, 200),
      key: String(a.key || "").slice(0, 500),
      mimeType: String(a.mimeType || "").slice(0, 100),
    }))
    .filter((a) => a.kind === "text" || a.key);

const withPreviewUrls = (rows, academyId) => {
  const prefix = `${academyId}/alter/`;
  return (rows || []).map((row) => {
    const attachments = (row.attachments || []).map((a) => {
      if (a?.kind === "image" && a?.key && String(a.key).startsWith(prefix)) {
        try {
          return {
            ...a,
            previewUrl: signUrlForView(a.key, 3600),
          };
        } catch {
          return { ...a };
        }
      }
      return { ...a };
    });
    return { ...row, attachments };
  });
};

const previewOf = (text = "") => {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  return t.length > 80 ? `${t.slice(0, 80)}…` : t;
};

const titleFromMessage = (text = "") => {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "새 대화";
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
};

/** 목록 제목: 화면 위치(contextLabel) 우선, 없으면 메시지 요약 */
const titleFromContext = (contextLabel, fallbackMessage = "") => {
  const fromCtx = String(contextLabel || "")
    .replace(/\s+/g, " ")
    .trim();
  if (fromCtx) {
    return fromCtx.length > 40 ? `${fromCtx.slice(0, 40)}…` : fromCtx;
  }
  return titleFromMessage(fallbackMessage);
};

/** AlterConversation.pageType enum — 미등록 값은 저장 실패를 피하기 위해 general로 떨어뜨린다 */
const ALLOWED_PAGE_TYPES = new Set([
  "syllabus-edit",
  "evaluation",
  "archive",
  "document",
  "form-response",
  "activity",
  "form-editor",
  "assessment-grade",
  "guide",
  "general",
  "",
]);

const normalizePageType = (pageType) => {
  if (pageType == null || pageType === "") return pageType || "general";
  const next = String(pageType);
  return ALLOWED_PAGE_TYPES.has(next) ? next : "general";
};

const seasonLabelOf = (season) => {
  if (!season) return "";
  return `${season.year || ""} ${season.term || ""}`.trim();
};

const resolveSeasonSchool = async (academyId, seasonId) => {
  if (!seasonId) return null;
  const season = await Season(academyId)
    .findById(seasonId)
    .select("school year term")
    .lean();
  return season || null;
};

/**
 * 학교 소속 학기 ID 목록 (레거시 school 필드 없는 대화 포함용)
 */
const seasonIdsForSchool = async (academyId, schoolId) => {
  if (!schoolId) return [];
  const ids = await Season(academyId).distinct("_id", { school: schoolId });
  return ids.map((id) => String(id));
};

/**
 * 목록: 사용자 × 학교 (학기 무관). seasonLabel 은 표시용으로 붙인다.
 */
export const listAlterConversations = async ({
  academyId,
  userId,
  schoolId,
  seasonId,
  limit = 30,
}) => {
  let school = schoolId ? String(schoolId) : "";
  if (!school && seasonId) {
    const season = await resolveSeasonSchool(academyId, seasonId);
    school = season?.school ? String(season.school) : "";
  }
  if (!school) {
    const err = new Error(FIELD_REQUIRED("school"));
    err.status = 400;
    throw err;
  }

  const seasonIds = await seasonIdsForSchool(academyId, school);
  const filter = {
    user: userId,
    isDeleted: false,
    $or: [
      { school },
      ...(seasonIds.length > 0
        ? [
            {
              $and: [
                {
                  $or: [{ school: { $exists: false } }, { school: null }],
                },
                { season: { $in: seasonIds } },
              ],
            },
          ]
        : []),
    ],
  };

  const rows = await AlterConversation(academyId)
    .find(filter)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(Math.min(100, Math.max(1, Number(limit) || 30)))
    .lean();

  const labelSeasonIds = [
    ...new Set(rows.map((r) => String(r.season || "")).filter(Boolean)),
  ];
  const seasons =
    labelSeasonIds.length > 0
      ? await Season(academyId)
          .find({ _id: { $in: labelSeasonIds } })
          .select("year term")
          .lean()
      : [];
  const labelById = new Map(
    seasons.map((s) => [String(s._id), seasonLabelOf(s)])
  );

  return rows.map((row) => ({
    ...row,
    school: row.school ? String(row.school) : school,
    season: row.season ? String(row.season) : "",
    seasonLabel: labelById.get(String(row.season)) || "",
  }));
};

export const createAlterConversation = async ({
  academyId,
  userId,
  seasonId,
  schoolId,
  title = "새 대화",
  pageType = "general",
  contextLabel = "",
  syllabusId = "",
}) => {
  if (!seasonId) {
    const err = new Error(FIELD_REQUIRED("season"));
    err.status = 400;
    throw err;
  }
  const season = await resolveSeasonSchool(academyId, seasonId);
  if (!season) {
    const err = new Error(__NOT_FOUND("season"));
    err.status = 404;
    throw err;
  }
  const school = schoolId || season.school;
  if (!school) {
    const err = new Error(FIELD_REQUIRED("school"));
    err.status = 400;
    throw err;
  }

  const doc = await AlterConversation(academyId).create({
    user: userId,
    school,
    season: seasonId,
    title: titleFromContext(contextLabel, title) || "새 대화",
    pageType: normalizePageType(pageType),
    contextLabel: contextLabel || "",
    syllabusId: syllabusId ? String(syllabusId) : "",
    lastMessageAt: new Date(),
    status: "idle",
  });
  const obj = doc.toObject();
  return {
    ...obj,
    seasonLabel: seasonLabelOf(season),
  };
};

export const getOwnedConversation = async ({
  academyId,
  userId,
  conversationId,
}) => {
  if (!conversationId) {
    const err = new Error(FIELD_REQUIRED("conversationId"));
    err.status = 400;
    throw err;
  }
  const doc = await AlterConversation(academyId).findOne({
    _id: conversationId,
    user: userId,
    isDeleted: false,
  });
  if (!doc) {
    const err = new Error(__NOT_FOUND("conversation"));
    err.status = 404;
    err.code = __NOT_FOUND("conversation");
    throw err;
  }
  return doc;
};

export const listAlterMessages = async ({
  academyId,
  userId,
  conversationId,
  limit = 200,
}) => {
  await getOwnedConversation({ academyId, userId, conversationId });
  const rows = await AlterMessage(academyId)
    .find({ conversation: conversationId, isDeleted: false })
    .sort({ createdAt: 1 })
    .limit(Math.min(500, Math.max(1, Number(limit) || 200)))
    .lean();
  return withPreviewUrls(rows, academyId);
};

export const renameAlterConversation = async ({
  academyId,
  userId,
  conversationId,
  title,
}) => {
  const doc = await getOwnedConversation({
    academyId,
    userId,
    conversationId,
  });
  const next = String(title || "").trim();
  if (!next) {
    const err = new Error(FIELD_REQUIRED("title"));
    err.status = 400;
    throw err;
  }
  doc.title = titleFromMessage(next);
  doc.titleCustom = true;
  await doc.save();
  return doc.toObject();
};

export const deleteAlterConversation = async ({
  academyId,
  userId,
  conversationId,
}) => {
  const doc = await getOwnedConversation({
    academyId,
    userId,
    conversationId,
  });
  if (doc.status === "working") {
    const err = new Error("진행 중인 대화는 삭제할 수 없습니다.");
    err.status = 409;
    throw err;
  }
  doc.isDeleted = true;
  doc.status = "idle";
  await doc.save();
  return { ok: true };
};

const BULK_DELETE_MAX = 100;

/**
 * 소유 대화 일괄 소프트 삭제. working 상태는 건너뛴다.
 * @returns {{ deleted: string[], skipped: Array<{ id: string, reason: string }> }}
 */
export const bulkDeleteAlterConversations = async ({
  academyId,
  userId,
  conversationIds = [],
}) => {
  const ids = [
    ...new Set(
      (Array.isArray(conversationIds) ? conversationIds : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    ),
  ].slice(0, BULK_DELETE_MAX);

  if (ids.length === 0) {
    const err = new Error(FIELD_REQUIRED("ids"));
    err.status = 400;
    throw err;
  }

  const skipped = [];
  const queryIds = [];
  for (const id of ids) {
    if (!mongoose.isValidObjectId(id)) {
      skipped.push({ id, reason: "not_found" });
      continue;
    }
    queryIds.push(id);
  }

  const rows =
    queryIds.length > 0
      ? await AlterConversation(academyId)
          .find({
            _id: { $in: queryIds },
            user: userId,
            isDeleted: false,
          })
          .select("_id status")
          .lean()
      : [];

  const found = new Map(rows.map((r) => [String(r._id), r]));
  const deleted = [];

  for (const id of queryIds) {
    const row = found.get(id);
    if (!row) {
      skipped.push({ id, reason: "not_found" });
      continue;
    }
    if (row.status === "working") {
      skipped.push({ id, reason: "working" });
      continue;
    }
    deleted.push(id);
  }

  if (deleted.length > 0) {
    await AlterConversation(academyId).updateMany(
      {
        _id: { $in: deleted },
        user: userId,
        isDeleted: false,
        status: { $ne: "working" },
      },
      { $set: { isDeleted: true, status: "idle" } }
    );
  }

  return { deleted, skipped };
};

export const setAlterConversationStatus = async ({
  academyId,
  userId,
  conversationId,
  status,
}) => {
  const doc = await getOwnedConversation({
    academyId,
    userId,
    conversationId,
  });
  doc.status = status;
  await doc.save();
  return doc.toObject();
};

/**
 * 유저 메시지 + AI 응답을 저장하고 세션 메타를 갱신.
 * 학기가 바뀌어도 같은 대화를 이어가며, season/school 메타만 현재 값으로 갱신한다.
 */
export const appendAlterTurn = async ({
  academyId,
  userId,
  seasonId,
  conversationId,
  userMessage,
  assistantMessage,
  skill = "chat",
  pageType,
  contextLabel,
  syllabusId,
  tokenUsage,
  review,
  draft,
  links,
  attachments,
  markWorking = false,
}) => {
  const season = await resolveSeasonSchool(academyId, seasonId);
  if (!seasonId || !season) {
    const err = new Error(FIELD_REQUIRED("season"));
    err.status = 400;
    throw err;
  }
  const schoolId = season.school;

  let conversation = null;
  if (conversationId) {
    conversation = await getOwnedConversation({
      academyId,
      userId,
      conversationId,
    });
    // 학기 전환 후에도 이어서 사용 — 최근 학기/학교 메타만 갱신
    conversation.season = seasonId;
    if (schoolId && !conversation.school) {
      conversation.school = schoolId;
    } else if (schoolId) {
      conversation.school = schoolId;
    }
    // 한 대화에서 여러 Skill 허용 — lastSkill은 최근 실행 스킬 메타로만 갱신
  } else {
    conversation = await AlterConversation(academyId).create({
      user: userId,
      school: schoolId,
      season: seasonId,
      title: titleFromContext(contextLabel, userMessage),
      pageType: normalizePageType(pageType),
      contextLabel: contextLabel || "",
      syllabusId: syllabusId ? String(syllabusId) : "",
      lastSkill: skill,
      lastMessageAt: new Date(),
      status: markWorking ? "working" : "idle",
    });
  }

  const Message = AlterMessage(academyId);
  const created = [];

  if (userMessage != null) {
    const storedAttachments = normalizeStoredAttachments(attachments);
    const userDoc = await Message.create({
      conversation: conversation._id,
      role: "user",
      content: String(userMessage || ""),
      skill,
      attachments: storedAttachments,
    });
    created.push(userDoc.toObject());
  }

  if (assistantMessage != null) {
    const aiDoc = await Message.create({
      conversation: conversation._id,
      role: "assistant",
      content: String(assistantMessage || ""),
      skill,
      review: review || null,
      draft: draft || null,
      links: normalizeAlterGuideLinks(links),
      tokenUsage: tokenUsage || undefined,
    });
    created.push(aiDoc.toObject());
  }

  conversation.lastMessageAt = new Date();
  // 목록 구분용: 사용자 요청 요약을 우선 (완료 턴의 assistant로 덮어쓰지 않음)
  if (userMessage != null && String(userMessage).trim()) {
    conversation.lastMessagePreview = previewOf(userMessage);
  } else if (
    !conversation.lastMessagePreview &&
    assistantMessage != null
  ) {
    conversation.lastMessagePreview = previewOf(assistantMessage);
  }
  // 최근 실행 Skill (목록 표시용) — 한 대화에서 스킬 전환 가능
  conversation.lastSkill = skill || conversation.lastSkill || "chat";
  conversation.messageCount = (conversation.messageCount || 0) + created.length;
  conversation.status = markWorking ? "working" : "idle";
  if (pageType) conversation.pageType = normalizePageType(pageType);
  if (contextLabel != null) {
    conversation.contextLabel = contextLabel;
    if (!conversation.titleCustom) {
      const fromCtx = titleFromContext(contextLabel, "");
      if (fromCtx && fromCtx !== "새 대화") {
        conversation.title = fromCtx;
      }
    }
  }
  if (
    (!conversation.title || conversation.title === "새 대화") &&
    userMessage
  ) {
    conversation.title = titleFromMessage(userMessage);
  }
  if (syllabusId != null) conversation.syllabusId = String(syllabusId || "");
  await conversation.save();

  return {
    conversation: {
      ...conversation.toObject(),
      seasonLabel: seasonLabelOf(season),
    },
    messages: created,
  };
};
