/**
 * Alter turn HTTP handler. SSE event names stay as they were.
 * error events are { code, message }. The agent skill runs through the chat runner.
 */
import { logger } from "../log/logger.js";
import { AlterError, toPublicAlterError } from "../alter/core/errors.js";
import {
  SKILL_IDS,
  runAlterSkill,
  detectSkillFromMessage,
} from "../services/aiSkills.js";
import {
  appendAlterTurn,
  setAlterConversationStatus,
} from "../services/alterConversations.js";

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
      const missing = toPublicAlterError(
        new AlterError("INVALID_INPUT", 400, "학기가 필요합니다.")
      );
      if (wantsSse) {
        sendEvent("error", { code: missing.code, message: missing.message });
        return res.end();
      }
      return res.status(missing.status).send({ code: missing.code, message: missing.message });
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
    const pub = toPublicAlterError(err);
    if (wantsSse) {
      sendEvent("error", { code: pub.code, message: pub.message, conversationId });
      return res.end();
    }
    return res.status(pub.status).send({ code: pub.code, message: pub.message, conversationId });
  }
};
