/**
 * AI Chat Service
 * @description AI 챗봇(Alter) 관련 비즈니스 로직
 */

import { AIChatSession, AIChatMessage } from "../models/index.js";
import { Academy } from "../models/Academy.js";

/**
 * 학생의 AI 채팅 세션을 조회하거나 새로 생성
 * @param {string} academyId
 * @param {Object} board - Board document
 * @param {Object} user - req.user
 * @returns {Object} session document
 */
export const getOrCreateSession = async (academyId, board, user) => {
  let session = await AIChatSession(academyId).findOne({
    board: board._id,
    student: user._id,
  });

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
 * 대화 이력을 기반으로 Gemini 프롬프트 구성
 * @param {Object} board - Board document
 * @param {Array} messages - 최근 메시지 배열
 * @returns {Array} Gemini contents 배열
 */
export const buildAIChatContents = (board, messages) => {
  const systemInstruction = `당신은 "${board.title || board.name}"이라는 학습 보드의 AI 도우미 "Alter"입니다.
학생들의 학습을 돕고 질문에 친절하게 답변해주세요.
답변은 한국어로 작성하며, 학생 수준에 맞게 이해하기 쉽게 설명해주세요.
부적절한 요청에는 정중히 거절하고, 학습과 관련된 내용에 집중해주세요.`;

  const contents = messages.map((msg) => ({
    role: msg.senderType === "ai" ? "model" : "user",
    parts: [
      {
        text:
          msg.senderType === "teacher"
            ? `[교사 ${msg.senderName}] ${msg.content}`
            : msg.content,
      },
    ],
  }));

  return { systemInstruction, contents };
};

/**
 * Gemini API 호출 (non-streaming)
 * @param {string} academyId
 * @param {string} systemInstruction
 * @param {Array} contents - Gemini contents 배열
 * @param {Object} user - req.user (토큰 로깅용)
 * @returns {{ text: string, tokenUsage: Object|null }}
 */
export const callGemini = async (
  academyId,
  systemInstruction,
  contents,
  user
) => {
  const academy = await Academy.findOne(
    { academyId },
    "+aiApiKey"
  );

  if (!academy || !academy.aiEnabled || !academy.aiApiKey) {
    throw new Error("AI_NOT_AVAILABLE");
  }

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(academy.aiApiKey);
  const modelName = academy.aiModel || "gemini-2.5-flash";
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
  });

  const result = await model.generateContent({ contents });
  const response = result.response;
  const text = response.text();

  // Token usage
  let tokenUsage = null;
  try {
    const usage = response.usageMetadata;
    if (usage) {
      tokenUsage = {
        promptTokens: usage.promptTokenCount || 0,
        candidatesTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
      };

      // Log usage (fire-and-forget)
      const { AIUsageLog } = await import("../models/index.js");
      AIUsageLog(academyId)
        .create({
          user: user._id,
          userId: user.userId,
          userName: user.userName,
          model: modelName,
          promptTokens: tokenUsage.promptTokens,
          candidatesTokens: tokenUsage.candidatesTokens,
          thoughtsTokens: 0,
          totalTokens: tokenUsage.totalTokens,
        })
        .catch(() => {});
    }
  } catch (_) {}

  return { text, tokenUsage };
};

/**
 * 보드의 admin/writer 유저 목록 추출
 * @param {Object} board - Board document
 * @returns {string[]} userId 배열
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
 * @param {string} academyId
 * @returns {boolean}
 */
export const checkAIEnabled = async (academyId) => {
  const academy = await Academy.findOne(
    { academyId },
    "+aiApiKey"
  );
  return !!(academy?.aiEnabled && academy?.aiApiKey);
};
