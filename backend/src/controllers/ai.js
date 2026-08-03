/**
 * AIAPI namespace
 * @namespace APIs.AIAPI
 * @description Alter AI — Skill 라우팅, 강의계획서 점검, 관리자 유틸
 */
import { logger } from "../log/logger.js";
import { FIELD_REQUIRED, __NOT_FOUND } from "../messages/index.js";
import { Academy } from "../models/Academy.js";
import { Season, School } from "../models/index.js";
import {
  generateText,
  listProviderModels,
  resolveProvider,
  resolveModel,
  isValidProvider,
  pickPreferredModel,
} from "../services/aiProvider.js";
import {
  AI_ERRORS,
  FEATURE_PROFILES,
  normalizeGuidelines,
  extractSyllabusInputFields,
  buildGuidelinesTemplatePrompt,
  buildGuidelinesTemplateRetryPrompt,
  parseGuidelinesTemplate,
  FALLBACK_GUIDELINES_TEMPLATE,
} from "../services/aiPromptPolicy.js";
import { maskSensitiveText } from "../services/aiSafety.js";
import { logAIUsage } from "../services/aiUsage.js";
import {
  SKILL_IDS,
  listSkills,
  assertSeasonAiAccess,
  executeSyllabusDraftSkill,
  runAlterSkill,
  detectSkillFromMessage,
  mergeTokenUsage,
  resolveSkillPrepSettings,
  resolveSkillId,
} from "../services/aiSkills.js";
import {
  listAlterConversations as listAlterConversationsSvc,
  createAlterConversation as createAlterConversationSvc,
  listAlterMessages as listAlterMessagesSvc,
  renameAlterConversation as renameAlterConversationSvc,
  deleteAlterConversation as deleteAlterConversationSvc,
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
};

/**
 * @memberof APIs.AIAPI
 * @function ListAiSkills API
 * @route GET /ai/skills
 */
export const listAiSkills = async (_req, res) => {
  try {
    return res.status(200).send({ skills: listSkills() });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * Alter prep — 스킬별 저장된 지침·참고자료
 * @route GET /ai/alter/skill-settings?season=&skill=
 */
export const getAlterSkillSettings = async (req, res) => {
  try {
    const seasonId = req.query.season;
    const skill = resolveSkillId(req.query.skill || SKILL_IDS.CHAT);
    const { season, school } = await assertSeasonAiAccess(
      req.user.academyId,
      req.user,
      seasonId
    );
    const settings = await resolveSkillPrepSettings(
      req.user.academyId,
      school,
      season,
      skill
    );
    return res.status(200).send(settings);
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/**
 * Alter 대화 목록
 * @route GET /ai/alter/conversations?school=&season=
 * school 우선. season만 있으면 해당 학기의 학교로 조회 (하위 호환).
 * 학기와 무관하게 학교 단위로 대화를 모은다.
 */
export const listAlterConversations = async (req, res) => {
  try {
    const conversations = await listAlterConversationsSvc({
      academyId: req.user.academyId,
      userId: req.user._id,
      schoolId: req.query.school,
      seasonId: req.query.season,
      limit: req.query.limit,
    });
    return res.status(200).send({ conversations });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/**
 * Alter 대화 생성
 * @route POST /ai/alter/conversations
 */
export const createAlterConversation = async (req, res) => {
  try {
    const {
      season: seasonId,
      title,
      pageType,
      contextLabel,
      syllabusId,
    } = req.body || {};
    const conversation = await createAlterConversationSvc({
      academyId: req.user.academyId,
      userId: req.user._id,
      seasonId,
      title,
      pageType,
      contextLabel,
      syllabusId,
    });
    return res.status(200).send({ conversation });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/**
 * Alter 메시지 목록
 * @route GET /ai/alter/conversations/:id/messages
 */
export const listAlterMessages = async (req, res) => {
  try {
    const messages = await listAlterMessagesSvc({
      academyId: req.user.academyId,
      userId: req.user._id,
      conversationId: req.params.id,
      limit: req.query.limit,
    });
    return res.status(200).send({ messages });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/**
 * Alter 대화 이름 변경
 * @route PATCH /ai/alter/conversations/:id
 */
export const renameAlterConversation = async (req, res) => {
  try {
    const conversation = await renameAlterConversationSvc({
      academyId: req.user.academyId,
      userId: req.user._id,
      conversationId: req.params.id,
      title: req.body?.title,
    });
    return res.status(200).send({ conversation });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/**
 * Alter 대화 삭제(소프트)
 * @route DELETE /ai/alter/conversations/:id
 */
export const deleteAlterConversation = async (req, res) => {
  try {
    await deleteAlterConversationSvc({
      academyId: req.user.academyId,
      userId: req.user._id,
      conversationId: req.params.id,
    });
    return res.status(200).send({ ok: true });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
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
    skill === SKILL_IDS.DOCUMENT_DRAFT;

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
          skill: result.skill || skill,
          pageType: context.pageType,
          contextLabel: context.classTitle || context.label,
          syllabusId: context.syllabusId,
          tokenUsage: result.tokenUsage,
          review: result.review || null,
          draft: result.draft || null,
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
        conversationId: savedConversationId,
      });
      return res.end();
    }

    return res.status(200).send({
      skill: result.skill,
      message: result.text,
      review: result.review,
      draft: result.draft || null,
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

/**
 * @memberof APIs.AIAPI
 * @function ReviewSyllabusContent API
 * @description syllabus-draft Skill (SSE) — 하위 호환 엔드포인트
 */
export const reviewSyllabusContent = async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { season: seasonId, context, message = "" } = req.body;

    if (!seasonId) {
      sendEvent("error", { message: FIELD_REQUIRED("season") });
      return res.end();
    }

    sendEvent("step", { message: "설정 확인 중..." });

    const { academy, season, school } = await assertSeasonAiAccess(
      req.user.academyId,
      req.user,
      seasonId
    );

    const { draft, text } = await executeSyllabusDraftSkill({
      academyId: req.user.academyId,
      user: req.user,
      academy,
      season,
      school,
      context,
      message,
      onEvent: sendEvent,
    });

    sendEvent("done", {
      draft,
      text,
      skill: SKILL_IDS.SYLLABUS_DRAFT,
    });
    return res.end();
  } catch (err) {
    logger.error(err.message);
    const code =
      err.code ||
      (err.message && Object.values(AI_ERRORS).includes(err.message)
        ? err.message
        : mapProviderError(err));

    sendEvent("error", {
      message: AI_ERROR_MESSAGES[code] || code || AI_ERRORS.GENERATION_FAILED,
    });
    return res.end();
  }
};


/**
 * 학기 AI 기본 지침 추천 템플릿 생성 (관리자)
 * @memberof APIs.AIAPI
 * @function GenerateGuidelinesTemplate API
 */
export const generateGuidelinesTemplate = async (req, res) => {
  const profile = FEATURE_PROFILES.guidelinesTemplate;
  let provider = "unknown";
  let modelName = "unknown";

  try {
    const { season: seasonId } = req.body;
    if (!seasonId) {
      return res.status(400).send({ message: FIELD_REQUIRED("season") });
    }

    const academy = await Academy.findOne(
      { academyId: req.user.academyId },
      "+aiApiKey"
    );
    if (!academy) {
      return res.status(404).send({ message: __NOT_FOUND("academy") });
    }
    if (!academy.aiEnabled) {
      return res.status(403).send({ message: AI_ERRORS.NOT_ENABLED });
    }
    if (!academy.aiApiKey) {
      return res.status(400).send({ message: AI_ERRORS.API_KEY_NOT_SET });
    }

    const season = await Season(req.user.academyId).findById(seasonId);
    if (!season) {
      return res.status(404).send({ message: __NOT_FOUND("season") });
    }

    let schoolName = "";
    if (season.school) {
      const school = await School(req.user.academyId).findById(season.school);
      if (school && school.aiEnabled === false) {
        return res.status(403).send({ message: AI_ERRORS.NOT_ENABLED });
      }
      schoolName = school?.schoolName || "";
    }

    const fields = extractSyllabusInputFields(season.formSyllabus);
    const fieldNames = fields.map((f) => f.name).slice(0, 24);
    const seasonLabel = [season.year, season.term].filter(Boolean).join(" ");

    provider = resolveProvider(academy.aiProvider);
    modelName = resolveModel(provider, academy.aiModel);

    const prompt = buildGuidelinesTemplatePrompt({
      schoolName,
      seasonLabel,
      fieldNames,
    });
    const safePrompt = maskSensitiveText(prompt).text;

    const result = await generateText({
      provider,
      apiKey: academy.aiApiKey,
      model: modelName,
      messages: [{ role: "user", content: safePrompt }],
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
    });

    let tokenUsage = result.tokenUsage;
    let guidelines = parseGuidelinesTemplate(result.text);

    if (!guidelines) {
      const retryPrompt = buildGuidelinesTemplateRetryPrompt();
      const retryResult = await generateText({
        provider,
        apiKey: academy.aiApiKey,
        model: modelName,
        messages: [
          { role: "user", content: safePrompt },
          ...(String(result.text || "").trim()
            ? [
                { role: "assistant", content: String(result.text) },
                { role: "user", content: retryPrompt },
              ]
            : [{ role: "user", content: retryPrompt }]),
        ],
        temperature: 0.1,
        maxTokens: profile.maxTokens,
      });
      tokenUsage = mergeTokenUsage(tokenUsage, retryResult.tokenUsage);
      guidelines = parseGuidelinesTemplate(retryResult.text);
    }

    // 형식이 계속 깨지면 검증된 한국어 기본 템플릿 제공
    if (!guidelines) {
      guidelines = normalizeGuidelines(FALLBACK_GUIDELINES_TEMPLATE);
      logAIUsage(req.user.academyId, {
        user: req.user,
        provider,
        model: modelName,
        feature: profile.feature,
        success: true,
        tokenUsage,
        errorCode: "GUIDELINES_FALLBACK",
      });
      return res.status(200).send({
        guidelines,
        usedFallback: true,
      });
    }

    logAIUsage(req.user.academyId, {
      user: req.user,
      provider,
      model: modelName,
      feature: profile.feature,
      success: true,
      tokenUsage,
    });

    return res.status(200).send({ guidelines });
  } catch (err) {
    logger.error(err.message);
    const code =
      err.code ||
      (err.message && Object.values(AI_ERRORS).includes(err.message)
        ? err.message
        : mapProviderError(err));

    logAIUsage(req.user.academyId, {
      user: req.user,
      provider,
      model: modelName,
      feature: profile.feature,
      success: false,
      errorCode: code,
    });

    // API 오류여도 관리자가 바로 쓸 수 있는 기본 템플릿 반환
    return res.status(200).send({
      guidelines: normalizeGuidelines(FALLBACK_GUIDELINES_TEMPLATE),
      usedFallback: true,
      message: code || AI_ERRORS.GENERATION_FAILED,
    });
  }
};

/**
 * @memberof APIs.AIAPI
 * @function TestAiApiKey API
 */
export const testApiKey = async (req, res) => {
  try {
    const { apiKey, aiModel, provider } = req.body;

    if (!apiKey) {
      return res.status(400).send({ message: FIELD_REQUIRED("apiKey") });
    }

    const testMessages = [{ role: "user", content: "Say hello" }];
    const resolvedProvider = resolveProvider(provider);

    try {
      await generateText({
        provider: resolvedProvider,
        apiKey,
        model: aiModel,
        messages: testMessages,
        temperature: 0,
        maxTokens: 32,
      });

      let models = [];
      try {
        models = await listProviderModels({
          provider: resolvedProvider,
          apiKey,
        });
      } catch (_) {}

      const suggestedModel = pickPreferredModel(models, aiModel);
      return res.status(200).send({
        valid: true,
        models,
        suggestedModel:
          suggestedModel && suggestedModel !== aiModel
            ? suggestedModel
            : undefined,
      });
    } catch (err) {
      if (err.status === 404) {
        try {
          const models = await listProviderModels({
            provider: resolvedProvider,
            apiKey,
          });
          const fallback = pickPreferredModel(
            models,
            resolveModel(resolvedProvider)
          );
          if (fallback && fallback !== aiModel) {
            await generateText({
              provider: resolvedProvider,
              apiKey,
              model: fallback,
              messages: testMessages,
              temperature: 0,
              maxTokens: 32,
            });
            return res.status(200).send({
              valid: true,
              models,
              suggestedModel: fallback,
              error: `선택한 모델은 이 API 키에서 사용할 수 없어 ${fallback}로 테스트했습니다. 저장 시 이 모델이 적용됩니다.`,
            });
          }
        } catch (retryErr) {
          logger.error(retryErr.message);
        }

        return res.status(200).send({
          valid: false,
          error:
            err.apiMessage ||
            "AI 모델을 찾을 수 없습니다. '모델 탐색'으로 사용 가능한 모델을 선택한 뒤 다시 테스트해주세요.",
        });
      }

      logger.error(err.message);
      if (err.status === 429) {
        return res.status(200).send({
          valid: true,
          error:
            "API 키는 유효하지만 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
        });
      }
      return res.status(200).send({
        valid: false,
        error: err.apiMessage || "API 키가 유효하지 않습니다.",
      });
    }
  } catch (err) {
    logger.error(err.message);
    return res
      .status(200)
      .send({ valid: false, error: "API 키가 유효하지 않습니다." });
  }
};

/**
 * @memberof APIs.AIAPI
 * @function ListAiModels API
 */
export const listModels = async (req, res) => {
  try {
    let { apiKey, provider } = req.body;
    const { academyId } = req.body;

    if (!apiKey && academyId) {
      const academy = await Academy.findOne({ academyId }, "+aiApiKey");
      if (academy?.aiApiKey) {
        apiKey = academy.aiApiKey;
        if (!isValidProvider(provider)) {
          provider = academy.aiProvider;
        }
      }
    }

    if (!apiKey) {
      return res
        .status(400)
        .send({ message: "API 키를 입력하거나 먼저 저장해주세요." });
    }

    const models = await listProviderModels({ provider, apiKey });
    return res.status(200).send({ models });
  } catch (err) {
    logger.error(err.message);
    if (err.status === 401 || err.status === 403) {
      return res
        .status(200)
        .send({ models: [], error: "API 키가 유효하지 않습니다." });
    }
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
