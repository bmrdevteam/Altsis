/**
 * Alter AI Skill Router
 * @description 범용 Alter 대화 + 특화 Skill(강의계획서 점검 등)
 */

import { Academy } from "../models/Academy.js";
import { Season, School, Registration, Syllabus } from "../models/index.js";
import {
  generateText,
  resolveProvider,
  resolveModel,
} from "./aiProvider.js";
import {
  AI_ERRORS,
  PROMPT_LIMITS,
  FEATURE_PROFILES,
  selectReferencesForPrompt,
  normalizeGuidelines,
  normalizeExamples,
  normalizeUserInputs,
  extractSyllabusInputFields,
  examplesFromSyllabusInfo,
  buildStyleRubricFromExamples,
  formatCurrentInfoForPrompt,
  parseSyllabusReviewJson,
  buildReviewRetryPrompt,
} from "./aiPromptPolicy.js";
import { maskSensitiveText } from "./aiSafety.js";
import { logAIUsage } from "./aiUsage.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

export const SKILL_IDS = {
  CHAT: "chat",
  SYLLABUS_REVIEW: "syllabus-review",
};

/** @type {Record<string, { id: string, name: string, description: string, profile: string }>} */
export const SKILL_CATALOG = {
  [SKILL_IDS.CHAT]: {
    id: SKILL_IDS.CHAT,
    name: "일반 대화",
    description: "학습·작성에 대한 범용 도우미 대화",
    profile: "chat",
  },
  [SKILL_IDS.SYLLABUS_REVIEW]: {
    id: SKILL_IDS.SYLLABUS_REVIEW,
    name: "강의계획서 점검",
    description: "작성 중인 강의계획서 초안을 전체 항목 기준으로 점검합니다",
    profile: "syllabusReview",
  },
};

export const listSkills = () => Object.values(SKILL_CATALOG);

export const resolveSkillId = (raw) => {
  const id = String(raw || SKILL_IDS.CHAT).trim();
  return SKILL_CATALOG[id] ? id : SKILL_IDS.CHAT;
};

export const mergeTokenUsage = (a, b) => {
  if (!b) return a || null;
  if (!a) return { ...b };
  return {
    promptTokens: (a.promptTokens || 0) + (b.promptTokens || 0),
    candidatesTokens: (a.candidatesTokens || 0) + (b.candidatesTokens || 0),
    thoughtsTokens: (a.thoughtsTokens || 0) + (b.thoughtsTokens || 0),
    totalTokens: (a.totalTokens || 0) + (b.totalTokens || 0),
  };
};

const mapProviderError = (err) => {
  if (err?.status === 404) return AI_ERRORS.MODEL_NOT_FOUND;
  if (err?.status === 401 || err?.status === 403) return AI_ERRORS.INVALID_API_KEY;
  return AI_ERRORS.GENERATION_FAILED;
};

/**
 * 학기/학교 AI 접근 권한 확인
 */
export const assertSeasonAiAccess = async (academyId, user, seasonId) => {
  if (!seasonId) {
    const err = new Error(FIELD_REQUIRED("season"));
    err.status = 400;
    err.code = FIELD_REQUIRED("season");
    throw err;
  }

  const academy = await Academy.findOne({ academyId }, "+aiApiKey");
  if (!academy) {
    const err = new Error(__NOT_FOUND("academy"));
    err.status = 404;
    err.code = __NOT_FOUND("academy");
    throw err;
  }
  if (!academy.aiEnabled) {
    const err = new Error(AI_ERRORS.NOT_ENABLED);
    err.status = 403;
    err.code = AI_ERRORS.NOT_ENABLED;
    throw err;
  }
  if (!academy.aiApiKey) {
    const err = new Error(AI_ERRORS.API_KEY_NOT_SET);
    err.status = 400;
    err.code = AI_ERRORS.API_KEY_NOT_SET;
    throw err;
  }

  const season = await Season(academyId).findById(seasonId);
  if (!season) {
    const err = new Error(__NOT_FOUND("season"));
    err.status = 404;
    err.code = __NOT_FOUND("season");
    throw err;
  }
  if (!season.aiSettings?.enabled) {
    const err = new Error(AI_ERRORS.NOT_ENABLED_FOR_SEASON);
    err.status = 403;
    err.code = AI_ERRORS.NOT_ENABLED_FOR_SEASON;
    throw err;
  }

  if (season.school) {
    const school = await School(academyId).findById(season.school);
    if (school && school.aiEnabled === false) {
      const err = new Error(AI_ERRORS.NOT_ENABLED);
      err.status = 403;
      err.code = AI_ERRORS.NOT_ENABLED;
      throw err;
    }
  }

  const registration = await Registration(academyId).findOne({
    season: seasonId,
    user: user._id,
  });
  if (!registration) {
    const err = new Error(__NOT_FOUND("registration"));
    err.status = 404;
    err.code = __NOT_FOUND("registration");
    throw err;
  }

  const hasPermission =
    registration.role === "teacher"
      ? season.aiSettings.permission?.teacher
      : season.aiSettings.permission?.student;

  if (!hasPermission) {
    const err = new Error(PERMISSION_DENIED);
    err.status = 403;
    err.code = PERMISSION_DENIED;
    throw err;
  }

  return { academy, season, registration };
};

/**
 * 모범 계획서 → 스타일 기준
 */
export const resolveStyleRubric = async (
  academyId,
  userId,
  seasonId,
  context,
  fields,
  aiSettings
) => {
  const fieldNames = (fields || []).map((f) =>
    typeof f === "string" ? f : f.name
  );
  let examples = {};
  let sourceLabel = "";

  if (context?.exampleSyllabusId) {
    const exampleSyllabus = await Syllabus(academyId)
      .findById(context.exampleSyllabusId)
      .select("classTitle user season info")
      .lean();
    const sameSeason =
      exampleSyllabus && String(exampleSyllabus.season) === String(seasonId);
    const isOwner =
      exampleSyllabus && String(exampleSyllabus.user) === String(userId);
    if (exampleSyllabus && (sameSeason || isOwner)) {
      examples = examplesFromSyllabusInfo(exampleSyllabus.info, fields);
      if (Object.keys(examples).length > 0) {
        sourceLabel = `${isOwner ? "내 계획서" : "학기 계획서"} 「${
          exampleSyllabus.classTitle || "제목 없음"
        }」`;
      }
    }
  }

  if (Object.keys(examples).length === 0) {
    const configuredIds = Array.isArray(aiSettings?.exampleSyllabusIds)
      ? aiSettings.exampleSyllabusIds
          .map((id) => String(id || "").trim())
          .filter(Boolean)
      : [];
    const merged = {};
    const labels = [];
    for (const id of configuredIds.slice(0, 2)) {
      const exampleSyllabus = await Syllabus(academyId)
        .findById(id)
        .select("classTitle season info")
        .lean();
      if (
        !exampleSyllabus ||
        String(exampleSyllabus.season) !== String(seasonId)
      ) {
        continue;
      }
      const part = examplesFromSyllabusInfo(exampleSyllabus.info, fields);
      Object.assign(merged, part);
      labels.push(exampleSyllabus.classTitle || "제목 없음");
    }
    if (Object.keys(merged).length > 0) {
      examples = merged;
      sourceLabel =
        labels.length === 1
          ? `학기 모범 계획서 「${labels[0]}」`
          : `학기 모범 계획서 ${labels.map((t) => `「${t}」`).join(" ")}`;
    }
  }

  if (Object.keys(examples).length === 0) {
    examples = normalizeExamples(aiSettings?.examples || {}, fieldNames);
    if (Object.keys(examples).length > 0) {
      sourceLabel = "학기 AI 설정 모범 문장";
    }
  }

  return {
    rubric: buildStyleRubricFromExamples(examples),
    sourceLabel,
  };
};

export const buildReviewPrompt = (
  context,
  aiSettings,
  stylePack,
  focusFields
) => {
  const fieldNames = (focusFields || []).map((f) =>
    typeof f === "string" ? f : f.name
  );
  const userInputs = normalizeUserInputs({
    goal: context.goal,
    additionalCriteria: context.additionalCriteria,
  });
  const currentInfo = context.currentInfo || {};

  let prompt = `당신은 학교 강의계획서 작성 코치입니다. 이미 작성된 초안을 점검하고 피드백만 제공합니다.
양식 본문 전체를 새로 쓰지 마세요. 총평과 지정된 항목의 짧은 코멘트·선택적 개선 문장만 JSON으로 반환하세요.
모범/스타일 기준의 다른 수업 주제·고유명사는 제안 문장에 넣지 마세요.
응답은 반드시 하나의 JSON 객체만, 마크다운·코드펜스·설명 문구 없이 출력하세요.

## 지침
${normalizeGuidelines(
  aiSettings?.guidelines ||
    "구체성, 학습목표와 활동의 연결, 평가와의 정합성을 중심으로 피드백하세요."
)}

`;

  const references = selectReferencesForPrompt(
    aiSettings?.references || [],
    context.referenceIndexes
  );
  if (references.length > 0) {
    prompt += `## 참고 자료\n`;
    for (const ref of references) {
      prompt += `### ${ref.title}\n${ref.content}\n\n`;
    }
  }

  if (stylePack?.rubric) {
    const sourceLine = stylePack.sourceLabel
      ? `\n(기준 출처: ${stylePack.sourceLabel})`
      : "";
    prompt += `## 스타일·완성도 기준${sourceLine}
${stylePack.rubric}

`;
  }

  prompt += `## 현재 수업
`;
  if (context.subject?.length) {
    prompt += `- 교과목: ${context.subject.join(" > ")}\n`;
  }
  if (context.classTitle) {
    prompt += `- 수업명: ${context.classTitle}\n`;
  }
  if (userInputs.goal) {
    prompt += `- 점검 시 강조할 목표: ${userInputs.goal}\n`;
  }
  if (userInputs.additionalCriteria) {
    prompt += `- 추가 기준: ${userInputs.additionalCriteria}\n`;
  }

  const includeSummary =
    context?.reviewChunkIndex === 0 || context?.reviewChunkIndex == null;

  prompt += `
## 작성된 초안 (점검 대상)
${formatCurrentInfoForPrompt(currentInfo, focusFields)}

## 점검 대상 항목 (모두 items에 포함)
${fieldNames.map((name) => `- ${JSON.stringify(name)}`).join("\n")}

## 요청
위 대상 항목을 빠짐없이 items에 넣고 JSON만 출력하세요.
comment는 각 1문장, suggestion은 보완이 필요할 때만(없으면 "").
미작성 항목은 level을 "empty"로 두고 comment는 짧게.
{
  ${
    includeSummary
      ? `"summary": "총평 2~3문장",
  "overallLevel": "good|fair|needs_work",`
      : `"summary": "",
  "overallLevel": "fair",`
  }
  "items": [
    { "field": "위 목록의 항목명", "level": "good|fair|needs_work|empty", "comment": "짧은 코멘트", "suggestion": "" }
  ]
}
- level: good(충분), fair(보통), needs_work(보완 필요), empty(미작성)
- field 이름은 점검 대상 항목과 정확히 동일해야 함
- suggestion은 해당 필드만의 짧은 개선안(이번 수업 주제)
`;

  return prompt;
};

const rankReviewLevel = (level) => {
  if (level === "needs_work") return 3;
  if (level === "empty") return 2;
  if (level === "fair") return 1;
  return 0;
};

export const mergeReviewChunks = (chunks, fieldNames = []) => {
  const byField = new Map();
  let summary = "";
  let overallLevel = "fair";

  for (const chunk of chunks) {
    if (!chunk) continue;
    if (!summary && chunk.summary) {
      summary = chunk.summary;
      overallLevel = chunk.overallLevel || overallLevel;
    }
    for (const item of chunk.items || []) {
      if (!item?.field || byField.has(item.field)) continue;
      byField.set(item.field, item);
    }
  }

  const items =
    fieldNames.length > 0
      ? fieldNames.map(
          (field) =>
            byField.get(field) || {
              field,
              level: "empty",
              comment: "점검 응답에 포함되지 않았습니다.",
              suggestion: "",
            }
        )
      : [...byField.values()];

  for (const item of items) {
    if (item.level === "empty") continue;
    if (rankReviewLevel(item.level) > rankReviewLevel(overallLevel)) {
      overallLevel = item.level;
    }
  }

  return {
    summary: summary || "작성된 내용을 바탕으로 전체 항목을 점검했습니다.",
    overallLevel,
    items,
  };
};

const reviewFieldChunk = async ({
  provider,
  apiKey,
  modelName,
  profile,
  prompt,
  fieldNames,
}) => {
  const safePrompt = maskSensitiveText(prompt).text;
  let fullText = "";
  let tokenUsage = null;

  const result = await generateText({
    provider,
    apiKey,
    model: modelName,
    messages: [{ role: "user", content: safePrompt }],
    temperature: profile.temperature,
    maxTokens: profile.maxTokens,
  });
  fullText = result.text || "";
  tokenUsage = result.tokenUsage;

  try {
    if (!fullText.trim()) {
      const err = new Error(AI_ERRORS.EMPTY_RESPONSE);
      err.code = AI_ERRORS.EMPTY_RESPONSE;
      throw err;
    }
    return {
      review: parseSyllabusReviewJson(fullText, fieldNames),
      tokenUsage,
    };
  } catch (_) {
    const retryPrompt = buildReviewRetryPrompt(fieldNames);
    const retryResult = await generateText({
      provider,
      apiKey,
      model: modelName,
      messages: [
        { role: "user", content: safePrompt },
        ...(fullText.trim()
          ? [
              { role: "assistant", content: fullText },
              { role: "user", content: retryPrompt },
            ]
          : [{ role: "user", content: retryPrompt }]),
      ],
      temperature: 0.2,
      maxTokens: profile.maxTokens,
    });
    fullText = retryResult.text || "";
    tokenUsage = mergeTokenUsage(tokenUsage, retryResult.tokenUsage);
    return {
      review: parseSyllabusReviewJson(fullText, fieldNames),
      tokenUsage,
    };
  }
};

/**
 * syllabus-review Skill 실행
 * @param {Object} params
 * @param {(event: string, data: any) => void} [params.onEvent]
 */
export const executeSyllabusReviewSkill = async ({
  academyId,
  user,
  academy,
  season,
  context,
  onEvent,
}) => {
  const profile = FEATURE_PROFILES.syllabusReview;
  const emit = typeof onEvent === "function" ? onEvent : () => {};

  emit("step", { message: "작성 내용 확인 중..." });

  const fields = extractSyllabusInputFields(context?.formSyllabus);
  if (fields.length === 0) {
    const err = new Error("점검할 강의계획서 입력 항목이 없습니다.");
    err.code = AI_ERRORS.GENERATION_FAILED;
    err.status = 400;
    throw err;
  }

  const allFieldNames = fields.map((f) => f.name);
  const chunkSize = PROMPT_LIMITS.REVIEW_CHUNK_FIELDS || 10;
  const fieldChunks = [];
  for (let i = 0; i < fields.length; i += chunkSize) {
    fieldChunks.push(fields.slice(i, i + chunkSize));
  }

  const stylePack = await resolveStyleRubric(
    academyId,
    user._id,
    season._id,
    context,
    fields,
    season.aiSettings
  );

  const provider = resolveProvider(academy.aiProvider);
  const modelName = resolveModel(provider, academy.aiModel);

  const reviewChunks = [];
  let tokenUsage = null;

  for (let i = 0; i < fieldChunks.length; i++) {
    const chunkFields = fieldChunks[i];
    const chunkNames = chunkFields.map((f) => f.name);
    emit("step", {
      message:
        fieldChunks.length > 1
          ? `AI가 항목을 점검하고 있습니다... (${i + 1}/${fieldChunks.length})`
          : "AI가 초안을 점검하고 있습니다...",
    });

    const prompt = buildReviewPrompt(
      { ...(context || {}), reviewChunkIndex: i },
      season.aiSettings,
      stylePack,
      chunkFields
    );

    try {
      const { review: chunkReview, tokenUsage: chunkUsage } =
        await reviewFieldChunk({
          provider,
          apiKey: academy.aiApiKey,
          modelName,
          profile,
          prompt,
          fieldNames: chunkNames,
        });
      reviewChunks.push(chunkReview);
      tokenUsage = mergeTokenUsage(tokenUsage, chunkUsage);
    } catch (chunkErr) {
      if (i === 0) throw chunkErr;
      emit("step", {
        message: `일부 항목(${i + 1}/${fieldChunks.length}) 점검을 건너뛰었습니다.`,
      });
      reviewChunks.push({
        summary: "",
        overallLevel: "fair",
        items: chunkNames.map((field) => ({
          field,
          level: "empty",
          comment: "이 구간 점검에 실패했습니다. 다시 시도해 주세요.",
          suggestion: "",
        })),
      });
    }
  }

  let review = mergeReviewChunks(reviewChunks, allFieldNames);
  review = {
    ...review,
    summary: maskSensitiveText(review.summary).text,
    items: review.items.map((item) => ({
      ...item,
      comment: maskSensitiveText(item.comment).text,
      suggestion: maskSensitiveText(item.suggestion).text,
    })),
  };

  logAIUsage(academyId, {
    user,
    provider,
    model: modelName,
    feature: profile.feature,
    success: true,
    tokenUsage,
  });

  return { review, provider, modelName, tokenUsage, skill: SKILL_IDS.SYLLABUS_REVIEW };
};

export const formatReviewAsChatText = (review) => {
  if (!review) return "점검 결과를 만들지 못했습니다.";
  const levelLabel = {
    good: "충분",
    fair: "보통",
    needs_work: "보완 필요",
    empty: "미작성",
  };
  const lines = [
    `**【강의계획서 점검 결과 · ${levelLabel[review.overallLevel] || review.overallLevel}】**`,
    "",
    review.summary || "",
    "",
  ];
  for (const item of review.items || []) {
    lines.push(
      `• **${item.field}** (${levelLabel[item.level] || item.level}): ${item.comment || ""}`
    );
    if (item.suggestion) {
      lines.push(`  제안: ${item.suggestion}`);
    }
  }
  lines.push("", "이어서 특정 항목을 더 다듬고 싶으면 말씀해 주세요.");
  return lines.join("\n");
};

const buildAlterChatSystem = (season, context, boardTitle) => {
  const guidelines = normalizeGuidelines(
    season?.aiSettings?.guidelines ||
      "구체성, 학습목표와 활동 연결, 평가 정합성을 중심으로 도와주세요."
  );
  const refs = selectReferencesForPrompt(
    season?.aiSettings?.references || [],
    context?.referenceIndexes
  );
  let refBlock = "";
  if (refs.length > 0) {
    refBlock =
      "\n## 참고 자료\n" +
      refs.map((r) => `### ${r.title}\n${r.content}`).join("\n\n");
  }

  const subject =
    Array.isArray(context?.subject) && context.subject.length
      ? context.subject.join(" > ")
      : "";
  const classTitle = context?.classTitle || "";

  const boardLine = boardTitle
    ? `학습 보드 「${boardTitle}」의 AI 도우미 "Alter"입니다.`
    : `학교 정보 시스템의 AI 도우미 "Alter"입니다.`;

  return `당신은 ${boardLine}
한국어로 친절하고 구체적으로 답하세요. 강의계획서·수업 설계 맥락이 있으면 이를 우선합니다.
당신이 AI임을 숨기지 마세요. 유해·개인정보 요청은 거절하세요.

## 학기 작성 지침
${guidelines}
${refBlock}

## 현재 수업 맥락
- 교과목: ${subject || "(미입력)"}
- 수업명: ${classTitle || "(미입력)"}
${
  context?.reviewSummary
    ? `\n## 직전 점검 총평\n${context.reviewSummary}\n`
    : ""
}
요청이 강의계획서 점검이면 항목별로 짧고 실행 가능한 조언을 주세요.
양식 전체를 한 번에 다시 쓰지 말고, 사용자가 묻는 범위만 다루세요.`;
};

/**
 * Alter 한 턴 실행 (Skill 라우팅)
 */
export const runAlterSkill = async ({
  academyId,
  user,
  skill: rawSkill,
  seasonId,
  context = {},
  message = "",
  history = [],
  boardTitle = "",
  onEvent,
}) => {
  const skill = resolveSkillId(rawSkill);
  const { academy, season } = await assertSeasonAiAccess(
    academyId,
    user,
    seasonId
  );

  if (skill === SKILL_IDS.SYLLABUS_REVIEW) {
    const result = await executeSyllabusReviewSkill({
      academyId,
      user,
      academy,
      season,
      context,
      onEvent,
    });
    return {
      skill,
      text: formatReviewAsChatText(result.review),
      review: result.review,
      tokenUsage: result.tokenUsage,
    };
  }

  // default: chat
  const profile = FEATURE_PROFILES.chat;
  const provider = resolveProvider(academy.aiProvider);
  const modelName = resolveModel(provider, academy.aiModel);
  const systemInstruction = buildAlterChatSystem(season, context, boardTitle);

  const chatMessages = [];
  for (const m of (history || []).slice(-16)) {
    if (!m?.content) continue;
    const role = m.role === "assistant" ? "assistant" : "user";
    chatMessages.push({
      role,
      content: maskSensitiveText(String(m.content)).text,
    });
  }
  if (message?.trim()) {
    chatMessages.push({
      role: "user",
      content: maskSensitiveText(message.trim()).text,
    });
  }
  if (chatMessages.length === 0) {
    const err = new Error(FIELD_REQUIRED("message"));
    err.status = 400;
    err.code = FIELD_REQUIRED("message");
    throw err;
  }

  onEvent?.("step", { message: "Alter가 답변을 준비하고 있습니다..." });

  try {
    const { text, tokenUsage } = await generateText({
      provider,
      apiKey: academy.aiApiKey,
      model: modelName,
      systemInstruction,
      messages: chatMessages,
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
      const err = new Error(AI_ERRORS.EMPTY_RESPONSE);
      err.code = AI_ERRORS.EMPTY_RESPONSE;
      throw err;
    }
    return { skill, text: safeText, review: null, tokenUsage };
  } catch (err) {
    if (!err.code) err.code = mapProviderError(err);
    logAIUsage(academyId, {
      user,
      provider,
      model: modelName,
      feature: profile.feature,
      success: false,
      errorCode: err.code,
    });
    throw err;
  }
};

export const detectSkillFromMessage = (message = "") => {
  const text = String(message || "").trim();
  if (!text) return SKILL_IDS.CHAT;
  if (
    /^(점검|리뷰|피드백)/.test(text) ||
    /계획서.*(점검|리뷰|피드백)/.test(text) ||
    /\/(점검|review)/i.test(text)
  ) {
    return SKILL_IDS.SYLLABUS_REVIEW;
  }
  return SKILL_IDS.CHAT;
};
