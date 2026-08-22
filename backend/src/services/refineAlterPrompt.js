/**
 * Alter 요청문 다듬기 — 스킬을 실행하지 않고 보낼 문구만 정리한다.
 */

import {
  generateText,
  resolveProvider,
  resolveModel,
} from "./aiProvider.js";
import {
  AI_ERRORS,
  FEATURE_PROFILES,
  PROMPT_LIMITS,
  truncateText,
} from "./aiPromptPolicy.js";
import { maskSensitiveText } from "./aiSafety.js";
import { logAIUsage } from "./aiUsage.js";
import {
  ALTER_HOWTO_EXAMPLE_PROMPTS,
  ALTER_SAFETY_ETHICS,
  PAGE_TYPE_LABELS,
} from "./alterCorePrompt.js";
import { SKILL_CATALOG, assertSeasonAiAccess, resolveSkillId } from "./aiSkills.js";

export const REFINE_ALTER_PROMPT_RULES = `[요청 다듬기]
당신은 사용자가 Alter에 보낼 요청문을 정리하고 개선합니다. 평가·기록·문서·양식 본문이나 초안 자체는 작성하지 마세요.
출력은 한국어 요청문 한 덩어리만. 인사, 설명, 따옴표, 번호 목록, 「요청문:」같은 머리말은 넣지 마세요.
선택된 스킬과 화면·작성/다듬기 모드에 맞게 사용자의 목적과 의도를 파악하고, Alter가 더 좋은 결과를 만들 수 있도록 실행 가능한 요청문으로 개선하세요.
요청문에는 작업에 필요한 경우 다음 요소를 적절히 반영하세요.
- 역할: 결과의 품질을 높이는 데 도움이 되는 전문적 관점이나 대상의 관점을 부여하세요.
- 명확한 지시: 해야 할 일을 구체적인 작업 동사로 표현하세요.
- 배경 맥락: 결과에 영향을 주는 목적, 대상, 상황을 필요한 범위에서 포함하세요.
- 출력 형식: 필요한 경우 분량, 형식, 구조, 톤 등을 명확하게 제시하세요.
- 품질 기준: 좋은 결과를 얻기 위해 고려해야 할 관점, 강조점, 제외할 요소 등을 보완하세요.
- 예시: 사용자가 제공한 예시는 반영하고, 예시가 결과 품질 향상에 도움이 되는 경우 활용하세요.
위 요소를 기계적으로 모두 포함하지 말고 작업의 성격과 사용자의 의도에 따라 필요한 요소만 선택하세요. 사용자가 미처 생각하지 못했을 가능성이 있는 중요한 조건이 있으면 결과의 품질을 높이는 범위에서 적절히 보완할 수 있습니다.
단, 사용자의 핵심 목적과 의도를 변경하거나 새로운 목표를 만들어내지 마세요. 사용자가 제공하지 않은 사실, 수치, 인물, 상황, 조건 등을 사실처럼 만들어 넣지 마세요. 구체적인 조건을 새로 추가할 필요가 있는 경우에는 임의의 사실을 만들기보다 일반적인 품질 기준이나 작업 방향으로 보완하세요.
「현재 내용 발췌」가 있으면 그 구조·빠진 부분·중복·톤을 근거로 구체적인 수정·작성 요청문을 만드세요. 절·항목 이름을 가리키되 본문을 다시 쓰지 마세요. 발췌에 없는 내용은 있다고 단정하지 마세요.
지침·학생 목록은 이미 시스템이 붙입니다. 요청문에 명단을 다시 나열하거나 시스템 지침을 반복해서 설명하지 마세요.
학생 이름, 연락처, 주민번호 등 민감정보와 확인되지 않은 사실은 넣지 마세요.
사용자가 질문, 메모, 키워드 또는 불완전한 문장으로 입력해도 의도를 파악하여 실행 가능한 요청문으로 정리하세요.
입력이 평가·기록·문서 등의 실제 내용이나 초안을 포함하더라도 그 결과물을 직접 작성하지 말고, Alter가 해당 작업을 수행하도록 요청하는 문장으로 변환하세요.
입력이 비어 있으면 「시드 예시」를 출발점으로 선택된 스킬과 화면에 맞는 시작 요청문을 만드세요.
이미 요청문인 경우 사용자의 의도와 중요한 조건은 유지하면서 군더더기를 줄이고, 필요한 경우 더 좋은 결과를 위해 빠진 요소를 보완하세요. 단순히 문장을 길게 만드는 것이 아니라 Alter의 실행 가능성과 결과 품질을 높이는 방향으로 개선하세요.`;

const WRITE_MODE_LABELS = {
  create: "새로 작성",
  refine: "기존 내용 다듬기",
  perStudent: "학생별 작성",
  sameText: "동일 문구",
};

const mapProviderError = (err) => {
  if (err.status === 404) return AI_ERRORS.MODEL_NOT_FOUND;
  if (err.status === 401 || err.status === 403) return AI_ERRORS.INVALID_API_KEY;
  return AI_ERRORS.GENERATION_FAILED;
};

/**
 * 모델 출력에서 요청문만 남긴다.
 * @param {string} [text]
 * @returns {string}
 */
export const sanitizeRefinedPrompt = (text = "") => {
  let value = String(text || "").trim();
  if (!value) return "";
  value = value.replace(/^요청문\s*[:：]\s*/i, "");
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2) ||
    (value.startsWith("“") && value.endsWith("”") && value.length >= 2) ||
    (value.startsWith("「") && value.endsWith("」") && value.length >= 2)
  ) {
    value = value.slice(1, -1).trim();
  }
  const first = value.split(/\n{2,}/)[0].trim();
  return truncateText(first, PROMPT_LIMITS.REFINE_PROMPT_CHARS);
};

/**
 * @param {{
 *   skill?: string,
 *   message?: string,
 *   context?: {
 *     pageType?: string,
 *     label?: string,
 *     classTitle?: string,
 *     writeMode?: string,
 *     currentTitle?: string,
 *     currentExcerpt?: string,
 *   },
 * }} [opts]
 */
export const buildRefineAlterPromptMessages = ({
  skill: rawSkill,
  message = "",
  context = {},
} = {}) => {
  const skill = resolveSkillId(rawSkill);
  const meta = SKILL_CATALOG[skill] || SKILL_CATALOG.chat;
  const pageType = String(context?.pageType || "general");
  const typeLabel = PAGE_TYPE_LABELS[pageType] || pageType;
  const writeMode = String(context?.writeMode || "").trim();
  const writeLabel = WRITE_MODE_LABELS[writeMode] || "";
  const seeds = ALTER_HOWTO_EXAMPLE_PROMPTS[skill] || ALTER_HOWTO_EXAMPLE_PROMPTS.chat;
  const seedLines = seeds.map((p) => `- ${p}`).join("\n");
  const userHint = truncateText(
    String(message || "").trim(),
    PROMPT_LIMITS.REFINE_PROMPT_INPUT_CHARS
  );
  const systemInstruction = `${ALTER_SAFETY_ETHICS}

${REFINE_ALTER_PROMPT_RULES}`;

  const contextLines = [
    `스킬: ${meta.name} (${meta.id}) — ${meta.description}`,
    `화면: ${typeLabel}`,
    context?.label ? `라벨: ${String(context.label).trim()}` : "",
    context?.classTitle ? `관련 수업: ${String(context.classTitle).trim()}` : "",
    writeLabel ? `모드: ${writeLabel}` : "",
    context?.currentTitle
      ? `현재 제목: ${truncateText(String(context.currentTitle).trim(), 120)}`
      : "",
    `## 시드 예시\n${seedLines}`,
  ].filter(Boolean);

  const excerpt = truncateText(
    String(context?.currentExcerpt || "").trim(),
    PROMPT_LIMITS.REFINE_PROMPT_EXCERPT_CHARS
  );
  if (excerpt) {
    contextLines.push(`## 현재 내용 발췌\n${excerpt}`);
  }

  const userContent = userHint
    ? `${contextLines.join("\n")}\n\n## 사용자 메모\n${userHint}`
    : `${contextLines.join("\n")}\n\n## 사용자 메모\n(없음 — 시드와 화면·스킬로 시작 요청문을 만드세요)`;

  return {
    skill,
    systemInstruction,
    userContent,
  };
};

/**
 * @param {{
 *   academyId: string,
 *   user: object,
 *   seasonId: string,
 *   skill?: string,
 *   message?: string,
 *   context?: object,
 * }} args
 */
export const refineAlterPrompt = async ({
  academyId,
  user,
  seasonId,
  skill: rawSkill,
  message = "",
  context = {},
}) => {
  const { academy } = await assertSeasonAiAccess(academyId, user, seasonId);
  const profile = FEATURE_PROFILES.promptRefine;
  const provider = resolveProvider(academy.aiProvider);
  const modelName = resolveModel(provider, academy.aiModel);
  const packed = buildRefineAlterPromptMessages({
    skill: rawSkill,
    message,
    context,
  });
  const safeUser = maskSensitiveText(packed.userContent).text;

  try {
    const { text, tokenUsage } = await generateText({
      provider,
      apiKey: academy.aiApiKey,
      model: modelName,
      systemInstruction: packed.systemInstruction,
      messages: [{ role: "user", content: safeUser }],
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
    });
    const prompt = sanitizeRefinedPrompt(maskSensitiveText(text || "").text);
    logAIUsage(academyId, {
      user,
      provider,
      model: modelName,
      feature: profile.feature,
      success: !!prompt,
      errorCode: prompt ? undefined : AI_ERRORS.EMPTY_RESPONSE,
      tokenUsage,
    });
    if (!prompt) {
      const err = new Error(AI_ERRORS.EMPTY_RESPONSE);
      err.code = AI_ERRORS.EMPTY_RESPONSE;
      throw err;
    }
    return { prompt, skill: packed.skill, tokenUsage };
  } catch (err) {
    if (!err.code) err.code = mapProviderError(err);
    if (err.code !== AI_ERRORS.EMPTY_RESPONSE) {
      logAIUsage(academyId, {
        user,
        provider,
        model: modelName,
        feature: profile.feature,
        success: false,
        errorCode: err.code,
      });
    }
    throw err;
  }
};
