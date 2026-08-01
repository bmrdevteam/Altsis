/**
 * AIAPI namespace
 * @namespace APIs.AIAPI
 * @description AI 기반 강의계획서 내용 생성 API
 */
import { logger } from "../log/logger.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";
import { Academy } from "../models/Academy.js";
import {
  Season,
  School,
  Registration,
  Enrollment,
  Syllabus,
} from "../models/index.js";
import {
  generateText,
  generateTextStream,
  listProviderModels,
  resolveProvider,
  resolveModel,
  isValidProvider,
  pickPreferredModel,
} from "../services/aiProvider.js";
import {
  AI_ERRORS,
  PROMPT_LIMITS,
  FEATURE_PROFILES,
  normalizeReferences,
  normalizeGuidelines,
  parseSyllabusJson,
  buildJsonRetryPrompt,
} from "../services/aiPromptPolicy.js";
import { maskSensitiveObject, maskSensitiveText } from "../services/aiSafety.js";
import { logAIUsage } from "../services/aiUsage.js";

/**
 * Extract input field names from formSyllabus editor data
 * @param {Object} formSyllabus - The formSyllabus structure
 * @returns {string[]} Array of field names
 */
const extractFieldNames = (formSyllabus) => {
  const fieldNames = [];
  if (!formSyllabus?.data) return fieldNames;

  for (const block of formSyllabus.data) {
    if (block.type === "table" && block.data?.table) {
      for (const row of block.data.table) {
        for (const cell of row) {
          // select/checkbox는 옵션 선택이므로 긴 문장 생성 대상에서 제외
          if (cell.type === "input") {
            const name = cell.name || cell.id;
            if (name && !fieldNames.includes(name)) fieldNames.push(name);
          }
        }
      }
    }
  }
  return fieldNames;
};

/**
 * Build prompt for AI
 */
const buildPrompt = (context, aiSettings, enrollments, syllabi) => {
  let prompt = `당신은 학교 강의계획서 작성을 도와주는 AI 어시스턴트입니다.
토큰을 절약하기 위해 각 항목은 2~4문장으로 간결하게 작성하세요. 불필요한 서론·반복은 넣지 마세요.

## 지침
${normalizeGuidelines(
  aiSettings?.guidelines ||
    "강의계획서의 각 항목을 체계적이고 구체적으로 작성해주세요."
)}

`;

  const references = normalizeReferences(aiSettings?.references || []);
  if (references.length > 0) {
    prompt += `## 참고 자료\n`;
    for (const ref of references) {
      prompt += `### ${ref.title}\n${ref.content}\n\n`;
    }
  }

  prompt += `## 현재 입력된 정보\n`;
  if (context.subject && context.subject.length > 0) {
    prompt += `- 교과목: ${context.subject.join(" > ")}\n`;
  }
  if (context.classTitle) {
    prompt += `- 수업명: ${context.classTitle}\n`;
  }
  if (context.point) {
    prompt += `- 학점: ${context.point}\n`;
  }
  if (context.limit) {
    prompt += `- 수강정원: ${context.limit}\n`;
  }

  if (syllabi && syllabi.length > 0) {
    prompt += `\n## 최근 개설 수업 (제목만 참고)\n`;
    for (const syllabus of syllabi.slice(0, PROMPT_LIMITS.HISTORY)) {
      prompt += `- ${syllabus.classTitle}\n`;
    }
  }

  if (enrollments && enrollments.length > 0) {
    prompt += `\n## 최근 수강 수업 (제목만 참고)\n`;
    for (const enrollment of enrollments.slice(0, PROMPT_LIMITS.HISTORY)) {
      prompt += `- ${enrollment.classTitle || enrollment.syllabusTitle}\n`;
    }
  }

  const fieldNames = extractFieldNames(context.formSyllabus);

  if (fieldNames.length > 0) {
    const brevity =
      fieldNames.length > 15
        ? "각 값은 1~2문장으로 매우 짧게 쓰세요. 주차별·평가 항목은 한 문장만 작성하세요."
        : "각 값은 문자열이며 2~4문장으로 간결하게 쓰세요.";
    prompt += `
## 요청
위 정보를 바탕으로 아래 항목만 JSON으로 작성하세요. ${brevity}
값 안에 실제 줄바꿈을 넣지 말고, 필요하면 \\n을 사용하세요. 키 이름은 아래 목록과 정확히 동일해야 합니다.

항목 목록:
`;
    for (const name of fieldNames) {
      // JSON 키로 안전하게 넣기 위해 stringify
      prompt += `- ${JSON.stringify(name)}\n`;
    }

    prompt += `
반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드블록이나 설명 문구는 넣지 마세요:
{
`;
    const jsonFields = fieldNames.map(
      (name) => `  ${JSON.stringify(name)}: "해당 항목 내용"`
    );
    prompt += jsonFields.join(",\n");
    prompt += `
}
`;
  } else {
    prompt += `
## 요청
아래 JSON 형식으로만 응답하세요. 각 값은 2~4문장으로 간결하게 작성하세요:
{
  "수업교재": "수업교재 내용",
  "개설배경": "개설배경 내용",
  "학습목표": "학습목표 내용",
  "학습계획": "주차별 학습 내용"
}
`;
  }

  return { prompt, fieldNames };
};

const mapProviderError = (err) => {
  if (err.status === 404) return AI_ERRORS.MODEL_NOT_FOUND;
  if (err.status === 401 || err.status === 403) return AI_ERRORS.INVALID_API_KEY;
  return AI_ERRORS.GENERATION_FAILED;
};

/**
 * @memberof APIs.AIAPI
 * @function GenerateSyllabusContent API
 */
export const generateSyllabusContent = async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  let provider = "unknown";
  let modelName = "unknown";
  const profile = FEATURE_PROFILES.syllabus;

  try {
    const { season: seasonId, context } = req.body;

    if (!seasonId) {
      sendEvent("error", { message: FIELD_REQUIRED("season") });
      return res.end();
    }

    sendEvent("step", { message: "설정 확인 중..." });

    const academy = await Academy.findOne(
      { academyId: req.user.academyId },
      "+aiApiKey"
    );
    if (!academy) {
      sendEvent("error", { message: __NOT_FOUND("academy") });
      return res.end();
    }
    if (!academy.aiEnabled) {
      sendEvent("error", { message: AI_ERRORS.NOT_ENABLED });
      return res.end();
    }
    if (!academy.aiApiKey) {
      sendEvent("error", { message: AI_ERRORS.API_KEY_NOT_SET });
      return res.end();
    }

    const season = await Season(req.user.academyId).findById(seasonId);
    if (!season) {
      sendEvent("error", { message: __NOT_FOUND("season") });
      return res.end();
    }
    if (!season.aiSettings?.enabled) {
      sendEvent("error", { message: AI_ERRORS.NOT_ENABLED_FOR_SEASON });
      return res.end();
    }

    if (season.school) {
      const school = await School(req.user.academyId).findById(season.school);
      if (school && school.aiEnabled === false) {
        sendEvent("error", { message: AI_ERRORS.NOT_ENABLED });
        return res.end();
      }
    }

    const registration = await Registration(req.user.academyId).findOne({
      season: seasonId,
      user: req.user._id,
    });
    if (!registration) {
      sendEvent("error", { message: __NOT_FOUND("registration") });
      return res.end();
    }

    const hasPermission =
      registration.role === "teacher"
        ? season.aiSettings.permission?.teacher
        : season.aiSettings.permission?.student;

    if (!hasPermission) {
      sendEvent("error", { message: PERMISSION_DENIED });
      return res.end();
    }

    sendEvent("step", { message: "입력 정보 확인 중..." });

    const [syllabi, enrollments] = await Promise.all([
      Syllabus(req.user.academyId)
        .find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(PROMPT_LIMITS.HISTORY)
        .select("classTitle")
        .lean(),
      Enrollment(req.user.academyId)
        .find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(PROMPT_LIMITS.HISTORY)
        .select("classTitle syllabusTitle")
        .lean(),
    ]);

    sendEvent("step", { message: "AI가 강의계획서를 작성하고 있습니다..." });

    provider = resolveProvider(academy.aiProvider);
    modelName = resolveModel(provider, academy.aiModel);

    const { prompt, fieldNames } = buildPrompt(
      context,
      season.aiSettings,
      enrollments,
      syllabi
    );
    const safePrompt = maskSensitiveText(prompt).text;

    let fullText = "";
    let tokenUsage = null;

    const streamResult = await generateTextStream(
      {
        provider,
        apiKey: academy.aiApiKey,
        model: modelName,
        messages: [{ role: "user", content: safePrompt }],
        temperature: profile.temperature,
        maxTokens: profile.maxTokens,
      },
      (chunkText) => sendEvent("generating", { text: chunkText })
    );
    fullText = streamResult.text || "";
    tokenUsage = streamResult.tokenUsage;

    let content;
    try {
      if (!fullText.trim()) {
        const err = new Error(AI_ERRORS.EMPTY_RESPONSE);
        err.code = AI_ERRORS.EMPTY_RESPONSE;
        throw err;
      }
      content = parseSyllabusJson(fullText, fieldNames);
    } catch (parseErr) {
      // JSON 실패/빈 응답 → 비스트리밍으로 1회 재시도
      sendEvent("step", { message: "응답 형식을 보정하는 중..." });
      const retryPrompt = `${safePrompt}

${buildJsonRetryPrompt(fieldNames)}`;
      const retryResult = await generateText({
        provider,
        apiKey: academy.aiApiKey,
        model: modelName,
        messages: [
          { role: "user", content: retryPrompt },
          ...(fullText.trim()
            ? [
                { role: "assistant", content: fullText },
                {
                  role: "user",
                  content: buildJsonRetryPrompt(fieldNames),
                },
              ]
            : []),
        ],
        temperature: 0.2,
        maxTokens: profile.maxTokens,
      });
      fullText = retryResult.text || "";
      if (retryResult.tokenUsage) {
        tokenUsage = {
          promptTokens:
            (tokenUsage?.promptTokens || 0) +
            (retryResult.tokenUsage.promptTokens || 0),
          candidatesTokens:
            (tokenUsage?.candidatesTokens || 0) +
            (retryResult.tokenUsage.candidatesTokens || 0),
          thoughtsTokens:
            (tokenUsage?.thoughtsTokens || 0) +
            (retryResult.tokenUsage.thoughtsTokens || 0),
          totalTokens:
            (tokenUsage?.totalTokens || 0) +
            (retryResult.tokenUsage.totalTokens || 0),
        };
      }
      if (fullText.trim()) {
        sendEvent("generating", { text: fullText, replace: true });
      }
      content = parseSyllabusJson(fullText, fieldNames);
    }

    content = maskSensitiveObject(content);

    logAIUsage(req.user.academyId, {
      user: req.user,
      provider,
      model: modelName,
      feature: profile.feature,
      success: true,
      tokenUsage,
    });

    sendEvent("done", { content });
    return res.end();
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

    const messageMap = {
      [AI_ERRORS.EMPTY_RESPONSE]:
        "AI가 빈 응답을 반환했습니다. 모델 설정을 확인하거나 다시 시도해주세요.",
      [AI_ERRORS.INVALID_JSON]:
        "AI 응답 형식이 올바르지 않습니다. 다시 생성해주세요.",
      [AI_ERRORS.MODEL_NOT_FOUND]:
        "AI 모델을 찾을 수 없습니다. 모델 설정을 확인해주세요.",
      [AI_ERRORS.INVALID_API_KEY]:
        "AI API 키가 유효하지 않습니다. 설정을 확인해주세요.",
    };

    sendEvent("error", {
      message: messageMap[code] || code || AI_ERRORS.GENERATION_FAILED,
    });
    return res.end();
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
