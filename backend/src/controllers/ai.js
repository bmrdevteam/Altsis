/**
 * AIAPI namespace
 * @namespace APIs.AIAPI
 * @description Alter AI — Skill 라우팅, 강의계획서 점검, 관리자 유틸
 */
import { logger } from "../log/logger.js";
import { FIELD_REQUIRED, PERMISSION_DENIED, __NOT_FOUND } from "../messages/index.js";
import { Academy } from "../models/Academy.js";
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
import { getMyAiUsage as getMyAiUsageSvc } from "../services/aiUsageQuota.js";
import {
  SKILL_IDS,
  listSkills,
  assertGuidelinesTemplateAccess,
  assertSeasonAiAccess,
  executeSyllabusDraftSkill,
  mergeTokenUsage,
} from "../services/aiSkills.js";
import { refineAlterPrompt as refineAlterPromptSvc } from "../services/refineAlterPrompt.js";

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
 * @memberof APIs.AIAPI
 * @function RMyAiUsage API
 * @route GET /ai/usage/me
 * @description 로그인 사용자의 오늘 AI Alt 사용량·한도 (1 Alt = 10,000 토큰)
 */
export const getMyAiUsage = async (req, res) => {
  try {
    const academy = await Academy.findOne({ academyId: req.user.academyId });
    if (!academy) {
      return res.status(404).send({ message: __NOT_FOUND("academy") });
    }
    const usage = await getMyAiUsageSvc(
      req.user.academyId,
      req.user,
      academy
    );
    return res.status(200).send(usage);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
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
 * Alter 요청문 다듬기 (대화 저장·스킬 실행 없음)
 * @memberof APIs.AIAPI
 * @route POST /ai/alter/refine-prompt
 */
export const refineAlterPrompt = async (req, res) => {
  const {
    season: seasonId,
    skill: rawSkill,
    message = "",
    context = {},
  } = req.body || {};

  try {
    if (!seasonId) {
      return res.status(400).send({ message: FIELD_REQUIRED("season") });
    }

    const slimContext = {
      pageType: context?.pageType || "general",
      label: context?.label || "",
      classTitle: context?.classTitle || "",
      writeMode: context?.writeMode || "",
      currentTitle: context?.currentTitle || "",
      currentExcerpt: context?.currentExcerpt || "",
    };

    const result = await refineAlterPromptSvc({
      academyId: req.user.academyId,
      user: req.user,
      seasonId,
      skill: rawSkill,
      message,
      context: slimContext,
    });

    return res.status(200).send({ prompt: result.prompt });
  } catch (err) {
    logger.error(err.message);
    const code =
      err.code ||
      (err.message && Object.values(AI_ERRORS).includes(err.message)
        ? err.message
        : mapProviderError(err));
    const rawMessage = String(err.message || "").trim();
    const isKoreanHint =
      /[가-힣]/.test(rawMessage) && !Object.values(AI_ERRORS).includes(rawMessage);
    const message =
      (isKoreanHint ? rawMessage : null) ||
      AI_ERROR_MESSAGES[code] ||
      rawMessage ||
      AI_ERRORS.GENERATION_FAILED;
    return res.status(err.status || 500).send({ message });
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

    const gate = await assertGuidelinesTemplateAccess(
      req.user.academyId,
      req.user,
      seasonId
    );
    if (gate.error) {
      return res.status(gate.error.status).send({ message: gate.error.message });
    }
    const { academy, season, schoolName } = gate;

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
      if (
        req.user.auth === "admin" &&
        req.user.academyId !== academyId
      ) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
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
