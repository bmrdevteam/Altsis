/**
 * AI Chat Service
 * @description AI 챗봇(Alter) 관련 비즈니스 로직
 */

import { AIChatSession, AIChatMessage } from "../models/index.js";
import { Academy } from "../models/Academy.js";
import {
  generateText,
  resolveProvider,
  resolveModel,
} from "./aiProvider.js";
import { FEATURE_PROFILES, AI_ERRORS } from "./aiPromptPolicy.js";
import { maskSensitiveText } from "./aiSafety.js";
import { logAIUsage } from "./aiUsage.js";
import { assertAiUserQuota } from "./aiUsageQuota.js";
import { assertCtrlEnabled } from "./entitlement.js";
import { buildBoardAlterSystemPrompt } from "./alterCorePrompt.js";

/** 보드 Alter 세션만 (양식 aiChat form/fieldId/row 세션 제외) */
export const boardAlterSessionFilter = (boardId, studentId) => {
  const query = {
    board: boardId,
    form: { $exists: false },
  };
  if (studentId) query.student = studentId;
  return query;
};

export const getOrCreateSession = async (academyId, board, user) => {
  let session = await AIChatSession(academyId).findOne(
    boardAlterSessionFilter(board._id, user._id)
  );

  if (session) return session;

  session = await AIChatSession(academyId).create({
    board: board._id,
    student: user._id,
    studentId: user.userId,
    studentName: user.userName,
  });

  return session;
};

/**
 * 대화 이력을 기반으로 AI 프롬프트 구성
 */
export const buildAIChatContents = (board, messages) => {
  const systemInstruction = buildBoardAlterSystemPrompt(board);

  const chatMessages = messages.map((msg) => {
    const raw =
      msg.senderType === "teacher"
        ? `[교사 ${msg.senderName}] ${msg.content}`
        : msg.content;
    return {
      role: msg.senderType === "ai" ? "assistant" : "user",
      content: maskSensitiveText(raw).text,
    };
  });

  return { systemInstruction, messages: chatMessages };
};

/**
 * AI API 호출 (non-streaming)
 */
export const callAI = async (academyId, systemInstruction, messages, user) => {
  const academy = await Academy.findOne({ academyId }, "+aiApiKey");

  if (!academy || !academy.aiEnabled || !academy.aiApiKey) {
    throw new Error(AI_ERRORS.NOT_AVAILABLE);
  }

  assertCtrlEnabled(academy);

  await assertAiUserQuota(academyId, user, academy);

  const provider = resolveProvider(academy.aiProvider);
  const modelName = resolveModel(provider, academy.aiModel);
  const profile = FEATURE_PROFILES.chat;

  try {
    const { text, tokenUsage } = await generateText({
      provider,
      apiKey: academy.aiApiKey,
      model: modelName,
      systemInstruction,
      messages,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
    });

    const safeText = maskSensitiveText(text || "").text;

    logAIUsage(academyId, {
      user,
      provider,
      model: modelName,
      feature: profile.feature,
      success: !!safeText.trim(),
      errorCode: safeText.trim() ? undefined : AI_ERRORS.EMPTY_RESPONSE,
      tokenUsage,
    });

    if (!safeText.trim()) {
      throw new Error(AI_ERRORS.EMPTY_RESPONSE);
    }

    return { text: safeText, tokenUsage };
  } catch (err) {
    if (
      err.message !== AI_ERRORS.EMPTY_RESPONSE &&
      err.message !== AI_ERRORS.NOT_AVAILABLE
    ) {
      logAIUsage(academyId, {
        user,
        provider,
        model: modelName,
        feature: profile.feature,
        success: false,
        errorCode:
          err.status === 404
            ? AI_ERRORS.MODEL_NOT_FOUND
            : err.status === 401 || err.status === 403
              ? AI_ERRORS.INVALID_API_KEY
              : AI_ERRORS.GENERATION_FAILED,
      });
    }
    throw err;
  }
};

/**
 * 보드의 admin/writer 유저 목록 추출
 */
export const getBoardTeacherUserIds = (board) => {
  const teacherUserIds = [];
  if (!board.altBoardRole) return teacherUserIds;

  const roleMap =
    board.altBoardRole instanceof Map
      ? board.altBoardRole
      : new Map(Object.entries(board.altBoardRole));

  for (const [userId, role] of roleMap) {
    if (role === "admin" || role === "writer") {
      teacherUserIds.push(userId);
    }
  }

  return teacherUserIds;
};

/**
 * AI 채팅 활성화 여부 확인
 */
export const checkAIEnabled = async (academyId) => {
  const academy = await Academy.findOne({ academyId }, "+aiApiKey");
  if (!academy?.aiEnabled || !academy?.aiApiKey) return false;
  const { normalizePlans } = await import("./entitlement.js");
  return normalizePlans(academy).ctrl.enabled;
};
