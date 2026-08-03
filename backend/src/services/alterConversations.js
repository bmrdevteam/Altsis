/**
 * Navbar Alter 대화 저장 서비스
 */
import { AlterConversation } from "../models/AlterConversation.js";
import { AlterMessage } from "../models/AlterMessage.js";
import { FIELD_REQUIRED, PERMISSION_DENIED, __NOT_FOUND } from "../messages/index.js";

const previewOf = (text = "") => {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > 80 ? `${t.slice(0, 80)}…` : t;
};

const titleFromMessage = (text = "") => {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "새 대화";
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
};

export const listAlterConversations = async ({
  academyId,
  userId,
  seasonId,
  limit = 30,
}) => {
  if (!seasonId) {
    const err = new Error(FIELD_REQUIRED("season"));
    err.status = 400;
    throw err;
  }
  const rows = await AlterConversation(academyId)
    .find({
      user: userId,
      season: seasonId,
      isDeleted: false,
    })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(Math.min(100, Math.max(1, Number(limit) || 30)))
    .lean();
  return rows;
};

export const createAlterConversation = async ({
  academyId,
  userId,
  seasonId,
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
  const doc = await AlterConversation(academyId).create({
    user: userId,
    season: seasonId,
    title: titleFromMessage(title) || "새 대화",
    pageType: pageType || "general",
    contextLabel: contextLabel || "",
    syllabusId: syllabusId ? String(syllabusId) : "",
    lastMessageAt: new Date(),
    status: "idle",
  });
  return doc.toObject();
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
  return rows;
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
  doc.isDeleted = true;
  doc.status = "idle";
  await doc.save();
  return { ok: true };
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
 * 유저 메시지 + AI 응답을 저장하고 세션 메타를 갱신
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
  markWorking = false,
}) => {
  let conversation = null;
  if (conversationId) {
    conversation = await getOwnedConversation({
      academyId,
      userId,
      conversationId,
    });
    if (String(conversation.season) !== String(seasonId)) {
      const err = new Error(PERMISSION_DENIED);
      err.status = 403;
      throw err;
    }
  } else {
    conversation = await AlterConversation(academyId).create({
      user: userId,
      season: seasonId,
      title: titleFromMessage(userMessage),
      pageType: pageType || "general",
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
    const userDoc = await Message.create({
      conversation: conversation._id,
      role: "user",
      content: String(userMessage || ""),
      skill,
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
      tokenUsage: tokenUsage || undefined,
    });
    created.push(aiDoc.toObject());
  }

  const previewSource =
    assistantMessage != null ? assistantMessage : userMessage;
  conversation.lastMessageAt = new Date();
  conversation.lastMessagePreview = previewOf(previewSource);
  conversation.lastSkill = skill || conversation.lastSkill;
  conversation.messageCount = (conversation.messageCount || 0) + created.length;
  conversation.status = markWorking ? "working" : "idle";
  if (
    (!conversation.title || conversation.title === "새 대화") &&
    userMessage
  ) {
    conversation.title = titleFromMessage(userMessage);
  }
  if (pageType) conversation.pageType = pageType;
  if (contextLabel != null) conversation.contextLabel = contextLabel;
  if (syllabusId != null) conversation.syllabusId = String(syllabusId || "");
  await conversation.save();

  return {
    conversation: conversation.toObject(),
    messages: created,
  };
};
