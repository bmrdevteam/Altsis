/**
 * Alter turn HTTP handler. SSE event names and payloads stay as they were
 * on the AI controller. The agent skill runs through the registered chat runner.
 */
import { logger } from "../log/logger.js";
import { FIELD_REQUIRED } from "../messages/index.js";
import { AI_ERRORS } from "../services/aiPromptPolicy.js";
import {
  SKILL_IDS,
  runAlterSkill,
  detectSkillFromMessage,
} from "../services/aiSkills.js";
import {
  appendAlterTurn,
  setAlterConversationStatus,
} from "../services/alterConversations.js";

const mapProviderError = (err) => {
  if (err.status === 404) return AI_ERRORS.MODEL_NOT_FOUND;
  if (err.status === 401 || err.status === 403) return AI_ERRORS.INVALID_API_KEY;
  return AI_ERRORS.GENERATION_FAILED;
};

const AI_ERROR_MESSAGES = {
  [AI_ERRORS.EMPTY_RESPONSE]:
    "AI가 빈 응답을 반환했습니다. 모델 설정을 확인하거나 다시 시도해주세요.",
  [AI_ERRORS.INVALID_JSON]:
    "AI 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.",
  [AI_ERRORS.MODEL_NOT_FOUND]:
    "AI 모델을 찾을 수 없습니다. 모델 설정을 확인해주세요.",
  [AI_ERRORS.INVALID_API_KEY]:
    "AI API 키가 유효하지 않습니다. 설정을 확인해주세요.",
  [AI_ERRORS.GENERATION_FAILED]:
    "AI 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  [AI_ERRORS.USAGE_LIMIT_EXCEEDED]:
    "오늘 AI 사용량(Alt) 한도를 초과했습니다. 관리자에게 문의해 주세요.",
};

/**
 * Alter 범용 턴 (Skill 라우팅)
 * @memberof APIs.AIAPI
 * @route POST /ai/alter
 * skill=syllabus-draft|evaluation-draft|archive-draft 이면 SSE, chat 이면 JSON
 * conversationId가 있으면(또는 없으면 생성) 유저·AI 메시지를 저장한다.
 */
export const runAlter = async (req, res) => {
  const {
    season: seasonId,
    skill: rawSkill,
    message = "",
    context = {},
    history = [],
    autoDetectSkill = true,
    conversationId: rawConversationId,
    persist = true,
  } = req.body || {};

  let skill = rawSkill;
  if (!skill && autoDetectSkill) {
    skill = detectSkillFromMessage(message);
  }
  skill = skill || SKILL_IDS.CHAT;

  const wantsSse =
    skill === SKILL_IDS.SYLLABUS_DRAFT ||
    skill === SKILL_IDS.EVALUATION_DRAFT ||
    skill === SKILL_IDS.ARCHIVE_DRAFT ||
    skill === SKILL_IDS.DOCUMENT_DRAFT ||
    skill === SKILL_IDS.DOCUMENT_REVIEW ||
    skill === SKILL_IDS.FORM_RESPONSE_DRAFT ||
    skill === SKILL_IDS.ACTIVITY_DRAFT ||
    skill === SKILL_IDS.FORM_DRAFT ||
    skill === SKILL_IDS.ASSESSMENT_GRADE ||
    skill === SKILL_IDS.SEARCH ||
    skill === SKILL_IDS.AGENT;

  if (wantsSse) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
  }

  const sendEvent = (event, data) => {
    if (!wantsSse) return;
    // 클라이언트가 닫혀도 서버 작업은 계속 (쓰기 실패는 무시)
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (_) {
      // disconnected client
    }
  };

  let conversationId = rawConversationId || null;

  try {
    if (!seasonId) {
      if (wantsSse) {
        sendEvent("error", { message: FIELD_REQUIRED("season") });
        return res.end();
      }
      return res.status(400).send({ message: FIELD_REQUIRED("season") });
    }

    if (wantsSse) sendEvent("step", { message: "설정 확인 중..." });

    if (persist !== false) {
      try {
        const started = await appendAlterTurn({
          academyId: req.user.academyId,
          userId: req.user._id,
          seasonId,
          conversationId: conversationId || null,
          userMessage: message,
          assistantMessage: null,
          skill,
          pageType: context.pageType,
          contextLabel: context.classTitle || context.label,
          syllabusId: context.syllabusId,
          attachments: context.attachments,
          markWorking: true,
        });
        conversationId = String(started.conversation._id);
        // 유저 메시지는 시작 시 저장 → 완료 시 중복 저장 방지
        req._alterUserMessageSaved = true;
      } catch (persistErr) {
        logger.error(`alter persist start: ${persistErr.message}`);
      }
    }

    const result = await runAlterSkill({
      academyId: req.user.academyId,
      user: req.user,
      skill,
      seasonId,
      context,
      message,
      history,
      onEvent: sendEvent,
    });

    let savedConversationId = conversationId;
    if (persist !== false) {
      try {
        const saved = await appendAlterTurn({
          academyId: req.user.academyId,
          userId: req.user._id,
          seasonId,
          conversationId,
          userMessage: req._alterUserMessageSaved ? null : message,
          assistantMessage: result.text || "",
          skill,
          pageType: context.pageType,
          contextLabel: context.classTitle || context.label,
          syllabusId: context.syllabusId,
          attachments: req._alterUserMessageSaved
            ? undefined
            : context.attachments,
          tokenUsage: result.tokenUsage,
          review: result.review || null,
          draft: result.draft || null,
          links: result.links || [],
          markWorking: false,
        });
        savedConversationId = String(saved.conversation._id);
      } catch (persistErr) {
        logger.error(`alter persist done: ${persistErr.message}`);
      }
    }

    if (wantsSse) {
      sendEvent("done", {
        skill: result.skill,
        review: result.review || null,
        draft: result.draft || null,
        message: result.text,
        links: result.links || [],
        scheduleProposal: result.scheduleProposal || null,
        conversationId: savedConversationId,
        ...(result.tokenUsage ? { tokenUsage: result.tokenUsage } : {}),
      });
      return res.end();
    }

    return res.status(200).send({
      skill: result.skill,
      message: result.text,
      review: result.review,
      draft: result.draft || null,
      links: result.links || [],
      scheduleProposal: result.scheduleProposal || null,
      conversationId: savedConversationId,
    });
  } catch (err) {
    logger.error(err.message);
    if (persist !== false && conversationId) {
      try {
        await setAlterConversationStatus({
          academyId: req.user.academyId,
          userId: req.user._id,
          conversationId,
          status: "error",
        });
      } catch (_) {
        // ignore
      }
    }
    const code =
      err.code ||
      (err.message && Object.values(AI_ERRORS).includes(err.message)
        ? err.message
        : mapProviderError(err));
    // 한글 안내 메시지는 코드 기본문구보다 우선 (예: 빈 칸 없음)
    const rawMessage = String(err.message || "").trim();
    const isKoreanHint = /[가-힣]/.test(rawMessage) && !Object.values(AI_ERRORS).includes(rawMessage);
    const message =
      (err.code === "AI_TIMEOUT" && err.message) ||
      (rawMessage &&
      /응답 시간이 초과|timeout/i.test(rawMessage)
        ? rawMessage
        : null) ||
      (isKoreanHint ? rawMessage : null) ||
      AI_ERROR_MESSAGES[code] ||
      rawMessage ||
      AI_ERRORS.GENERATION_FAILED;

    if (wantsSse) {
      sendEvent("error", { message, conversationId });
      return res.end();
    }
    return res.status(err.status || 500).send({ message, conversationId });
  }
};
