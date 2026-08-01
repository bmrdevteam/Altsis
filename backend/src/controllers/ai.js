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
import { Season, School, Registration, Enrollment, Syllabus, AIUsageLog } from "../models/index.js";
import {
  generateText,
  generateTextStream,
  listProviderModels,
  resolveProvider,
  resolveModel,
  isValidProvider,
  pickPreferredModel,
} from "../services/aiProvider.js";

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
          if (
            cell.type === "input" ||
            cell.type === "select" ||
            cell.type === "checkbox"
          ) {
            const name = cell.name || cell.id;
            if (name) fieldNames.push(name);
          }
        }
      }
    }
  }
  return fieldNames;
};

/**
 * Build prompt for AI
 * @param {Object} context - Current form context
 * @param {Object} aiSettings - Season AI settings
 * @param {Object[]} enrollments - User's enrollment history
 * @returns {string} Prompt for AI
 */
const HISTORY_LIMIT = 3;
const REFERENCE_LIMIT = 2;
const REFERENCE_MAX_CHARS = 800;

const truncateText = (text, maxChars) => {
  const value = String(text || "");
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}…`;
};

const buildPrompt = (context, aiSettings, enrollments, syllabi) => {
  let prompt = `당신은 학교 강의계획서 작성을 도와주는 AI 어시스턴트입니다.
토큰을 절약하기 위해 각 항목은 2~4문장으로 간결하게 작성하세요. 불필요한 서론·반복은 넣지 마세요.

## 지침
${truncateText(
  aiSettings?.guidelines ||
    "강의계획서의 각 항목을 체계적이고 구체적으로 작성해주세요.",
  600
)}

`;

  // 참고자료는 용량이 커질 수 있어 개수·길이를 제한
  if (aiSettings?.references && aiSettings.references.length > 0) {
    prompt += `## 참고 자료\n`;
    for (const ref of aiSettings.references.slice(0, REFERENCE_LIMIT)) {
      prompt += `### ${ref.title}\n${truncateText(ref.content, REFERENCE_MAX_CHARS)}\n\n`;
    }
  }

  // Add current context
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

  // 최근 이력은 제목만 짧게 (스타일 참고용)
  if (syllabi && syllabi.length > 0) {
    prompt += `\n## 최근 개설 수업 (제목만 참고)\n`;
    for (const syllabus of syllabi.slice(0, HISTORY_LIMIT)) {
      prompt += `- ${syllabus.classTitle}\n`;
    }
  }

  if (enrollments && enrollments.length > 0) {
    prompt += `\n## 최근 수강 수업 (제목만 참고)\n`;
    for (const enrollment of enrollments.slice(0, HISTORY_LIMIT)) {
      prompt += `- ${enrollment.classTitle || enrollment.syllabusTitle}\n`;
    }
  }

  // Extract field names from formSyllabus to build dynamic JSON schema
  const fieldNames = extractFieldNames(context.formSyllabus);

  if (fieldNames.length > 0) {
    prompt += `
## 요청
위 정보를 바탕으로 아래 항목만 JSON으로 작성하세요. 각 값은 문자열이며 2~4문장으로 간결하게 쓰세요.

항목 목록:
`;
    for (const name of fieldNames) {
      prompt += `- "${name}"\n`;
    }

    prompt += `
반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드블록이나 설명 문구는 넣지 마세요:
{
`;
    const jsonFields = fieldNames.map(
      (name) => `  "${name}": "해당 항목 내용"`
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

  return prompt;
};

/**
 * @memberof APIs.AIAPI
 * @function GenerateSyllabusContent API
 * @description AI를 사용하여 강의계획서 내용 생성
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/ai/syllabus/generate"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} req.body
 * @param {string} req.body.season - Season ObjectId
 * @param {Object} req.body.context - Current form context (subject, classTitle, etc.)
 *
 * @param {Object} res
 * @param {Object} res.content - Generated content
 *
 */
export const generateSyllabusContent = async (req, res) => {
  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { season: seasonId, context } = req.body;

    if (!seasonId) {
      sendEvent("error", { message: FIELD_REQUIRED("season") });
      return res.end();
    }

    sendEvent("step", { message: "설정 확인 중..." });

    // 1. Check Academy AI enabled and get API key
    const academy = await Academy.findOne(
      { academyId: req.user.academyId },
      "+aiApiKey"
    );
    if (!academy) {
      sendEvent("error", { message: __NOT_FOUND("academy") });
      return res.end();
    }
    if (!academy.aiEnabled) {
      sendEvent("error", { message: "AI_NOT_ENABLED" });
      return res.end();
    }
    if (!academy.aiApiKey) {
      sendEvent("error", { message: "AI_API_KEY_NOT_SET" });
      return res.end();
    }

    // 2. Check Season AI settings
    const season = await Season(req.user.academyId).findById(seasonId);
    if (!season) {
      sendEvent("error", { message: __NOT_FOUND("season") });
      return res.end();
    }
    if (!season.aiSettings?.enabled) {
      sendEvent("error", { message: "AI_NOT_ENABLED_FOR_SEASON" });
      return res.end();
    }

    // 2.5 Check School-level AI enabled
    if (season.school) {
      const school = await School(req.user.academyId).findById(season.school);
      if (school && school.aiEnabled === false) {
        sendEvent("error", { message: "AI_NOT_ENABLED" });
        return res.end();
      }
    }

    // 3. Check user permission
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

    // 4. 최근 이력은 제목만 소량 조회 (프롬프트 토큰 절약)
    sendEvent("step", { message: "입력 정보 확인 중..." });

    const [syllabi, enrollments] = await Promise.all([
      Syllabus(req.user.academyId)
        .find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(HISTORY_LIMIT)
        .select("classTitle")
        .lean(),
      Enrollment(req.user.academyId)
        .find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(HISTORY_LIMIT)
        .select("classTitle syllabusTitle")
        .lean(),
    ]);

    // 5. Call AI API with streaming
    sendEvent("step", { message: "AI가 강의계획서를 작성하고 있습니다..." });

    const provider = resolveProvider(academy.aiProvider);
    const modelName = resolveModel(provider, academy.aiModel);

    const prompt = buildPrompt(context, season.aiSettings, enrollments, syllabi);
    const { text: fullText, tokenUsage } = await generateTextStream(
      {
        provider,
        apiKey: academy.aiApiKey,
        model: modelName,
        messages: [{ role: "user", content: prompt }],
      },
      (chunkText) => sendEvent("generating", { text: chunkText })
    );

    if (!fullText?.trim()) {
      sendEvent("error", {
        message:
          "AI가 빈 응답을 반환했습니다. 모델 설정을 확인하거나 다시 시도해주세요.",
      });
      return res.end();
    }

    // 6. Log AI token usage
    if (tokenUsage) {
      AIUsageLog(req.user.academyId)
        .create({
          user: req.user._id,
          userId: req.user.userId,
          userName: req.user.userName,
          model: modelName,
          ...tokenUsage,
        })
        .catch(() => {});
    }

    // 7. Parse JSON response
    let content;
    try {
      const jsonMatch =
        fullText.match(/```json\n?([\s\S]*?)\n?```/) ||
        fullText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : fullText;
      content = JSON.parse(jsonStr);
    } catch (parseError) {
      content = { raw: fullText };
    }

    sendEvent("done", { content });
    return res.end();
  } catch (err) {
    logger.error(err.message);
    if (err.status === 404) {
      sendEvent("error", {
        message: "AI 모델을 찾을 수 없습니다. 모델 설정을 확인해주세요.",
      });
    } else if (err.status === 401 || err.status === 403) {
      sendEvent("error", {
        message: "AI API 키가 유효하지 않습니다. 설정을 확인해주세요.",
      });
    } else {
      sendEvent("error", {
        message:
          err.apiMessage ||
          err.message ||
          "AI 생성 중 오류가 발생했습니다.",
      });
    }
    return res.end();
  }
};

/**
 * @memberof APIs.AIAPI
 * @function TestAiApiKey API
 * @description AI API 키 테스트
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/ai/test"} req.url
 *
 * @param {Object} req.body
 * @param {string} req.body.apiKey - API key to test
 * @param {string} [req.body.provider] - AI 제공자 (openai | anthropic | gemini)
 * @param {string} [req.body.aiModel] - 테스트에 사용할 모델
 *
 * @param {Object} res
 * @param {boolean} res.valid - API key validity
 *
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
      });

      // 키가 유효하면 사용 가능 모델 목록도 함께 반환
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
      // 모델 미지원(신규 키에서 deprecated 모델 등)이면 사용 가능 모델로 재시도
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
    return res.status(200).send({ valid: false, error: "API 키가 유효하지 않습니다." });
  }
};

/**
 * @memberof APIs.AIAPI
 * @function ListAiModels API
 * @description API 키로 사용 가능한 AI 모델 목록 조회
 * @version 1.0.0
 */
export const listModels = async (req, res) => {
  try {
    let { apiKey, provider } = req.body;
    const { academyId } = req.body;

    // Use saved API key (and provider) if not provided
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
      return res.status(400).send({ message: "API 키를 입력하거나 먼저 저장해주세요." });
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
