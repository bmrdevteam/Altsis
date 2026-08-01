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
const buildPrompt = (context, aiSettings, enrollments, syllabi) => {
  let prompt = `당신은 학교 강의계획서 작성을 도와주는 AI 어시스턴트입니다.

## 지침
${aiSettings?.guidelines || "강의계획서의 각 항목을 체계적이고 구체적으로 작성해주세요."}

`;

  // Add reference materials if any
  if (aiSettings?.references && aiSettings.references.length > 0) {
    prompt += `## 참고 자료\n`;
    for (const ref of aiSettings.references) {
      prompt += `### ${ref.title}\n${ref.content}\n\n`;
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

  // Add user's teaching history (higher weight)
  if (syllabi && syllabi.length > 0) {
    prompt += `\n## 사용자 수업 개설 이력 (높은 가중치 - 직접 개설한 수업)\n`;
    prompt += `아래는 사용자가 직접 개설한 수업입니다. 수강 이력보다 우선적으로 참고하여 작성 스타일과 내용 수준을 맞춰주세요.\n`;
    for (const syllabus of syllabi.slice(0, 5)) {
      const subjectStr = syllabus.subject?.length > 0 ? ` (${syllabus.subject.join(" > ")})` : "";
      prompt += `- ${syllabus.classTitle}${subjectStr}\n`;
    }
  }

  // Add user's enrollment history for context
  if (enrollments && enrollments.length > 0) {
    prompt += `\n## 사용자 수강 이력 (참고용)\n`;
    for (const enrollment of enrollments.slice(0, 5)) {
      prompt += `- ${enrollment.classTitle || enrollment.syllabusTitle}\n`;
    }
  }

  // Extract field names from formSyllabus to build dynamic JSON schema
  const fieldNames = extractFieldNames(context.formSyllabus);

  if (fieldNames.length > 0) {
    prompt += `
## 요청
위 정보를 바탕으로 강의계획서의 다음 항목들을 작성해주세요.
각 항목에 대해 적절하고 구체적인 내용을 생성해주세요.

항목 목록:
`;
    for (const name of fieldNames) {
      prompt += `- "${name}"\n`;
    }

    prompt += `
반드시 아래 JSON 형식으로 응답해주세요. 키는 위 항목명을 그대로 사용하세요:
{
`;
    const jsonFields = fieldNames.map(
      (name) => `  "${name}": "해당 항목 내용"`
    );
    prompt += jsonFields.join(",\n");
    prompt += `
}

중요: JSON 키는 반드시 위 항목명과 정확히 일치해야 합니다. 각 값은 문자열이어야 합니다.
`;
  } else {
    prompt += `
## 요청
위 정보를 바탕으로 강의계획서의 다음 항목들을 작성해주세요:
1. 수업교재: 추천 교재 및 참고자료
2. 개설배경: 이 수업이 필요한 이유와 배경
3. 학습목표: 이 수업을 통해 달성할 구체적인 학습 목표 (3-5개)
4. 학습계획: 주차별 학습 내용 계획

JSON 형식으로 응답해주세요:
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

    // 4. Get user's teaching and enrollment history for context
    sendEvent("step", { message: "수업 개설 및 수강 이력 분석 중..." });

    const syllabi = await Syllabus(req.user.academyId)
      .find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("classTitle subject")
      .lean();

    if (syllabi.length > 0) {
      sendEvent("step", {
        message: `수업 개설 이력 ${syllabi.length}건 확인 완료`,
      });
    }

    const enrollments = await Enrollment(req.user.academyId)
      .find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (enrollments.length > 0) {
      sendEvent("step", {
        message: `수강 이력 ${enrollments.length}건 확인 완료`,
      });
    }

    // 5. Check reference materials
    const references = season.aiSettings?.references || [];
    if (references.length > 0) {
      sendEvent("step", {
        message: `참고 자료 ${references.length}건 확인 완료`,
        detail: references.map((r) => r.title).join(", "),
      });
    }

    // 6. Call AI API with streaming
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

    // 7. Log AI token usage
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

    // 8. Parse JSON response
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
      sendEvent("error", { message: "AI 생성 중 오류가 발생했습니다." });
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
