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
 * Build prompt for Gemini AI
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

    // 6. Call Gemini API with streaming
    sendEvent("step", { message: "AI가 강의계획서를 작성하고 있습니다..." });

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(academy.aiApiKey);
    const modelName = academy.aiModel || "gemini-2.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = buildPrompt(context, season.aiSettings, enrollments, syllabi);
    const result = await model.generateContentStream(prompt);

    let fullText = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      sendEvent("generating", { text: chunkText });
    }

    // 7. Log AI token usage
    try {
      const response = await result.response;
      const usage = response.usageMetadata;
      if (usage) {
        AIUsageLog(req.user.academyId)
          .create({
            user: req.user._id,
            userId: req.user.userId,
            userName: req.user.userName,
            model: modelName,
            promptTokens: usage.promptTokenCount || 0,
            candidatesTokens: usage.candidatesTokenCount || 0,
            thoughtsTokens: usage.thoughtsTokenCount || 0,
            totalTokens: usage.totalTokenCount || 0,
          })
          .catch(() => {});
      }
    } catch (_) {}

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
    if (err.message.includes("404") && err.message.includes("models/")) {
      sendEvent("error", {
        message:
          "AI 모델을 찾을 수 없습니다. @google/generative-ai SDK를 최신 버전으로 업데이트해주세요.",
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
 * @param {string} req.body.apiKey - Gemini API key to test
 *
 * @param {Object} res
 * @param {boolean} res.valid - API key validity
 *
 */
export const testApiKey = async (req, res) => {
  try {
    const { apiKey, aiModel } = req.body;

    if (!apiKey) {
      return res.status(400).send({ message: FIELD_REQUIRED("apiKey") });
    }

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = aiModel || "gemini-2.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    // Simple test prompt
    await model.generateContent("Say hello");

    return res.status(200).send({ valid: true });
  } catch (err) {
    logger.error(err.message);
    if (err.message.includes("429")) {
      return res.status(200).send({
        valid: true,
        error:
          "API 키는 유효하지만 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
      });
    }
    if (err.message.includes("404") && err.message.includes("models/")) {
      return res.status(200).send({
        valid: false,
        error:
          "AI 모델을 찾을 수 없습니다. 모델명을 확인해주세요.",
      });
    }
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
    let { apiKey } = req.body;
    const { academyId } = req.body;

    // Use saved API key if not provided
    if (!apiKey && academyId) {
      const academy = await Academy.findOne({ academyId }, "+aiApiKey");
      if (academy?.aiApiKey) {
        apiKey = academy.aiApiKey;
      }
    }

    if (!apiKey) {
      return res.status(400).send({ message: "API 키를 입력하거나 먼저 저장해주세요." });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    );

    if (!response.ok) {
      return res.status(200).send({ models: [], error: "API 키가 유효하지 않습니다." });
    }

    const data = await response.json();
    const models = (data.models || [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => ({
        name: m.name.replace("models/", ""),
        displayName: m.displayName,
      }));

    return res.status(200).send({ models });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
