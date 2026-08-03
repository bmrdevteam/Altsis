/**
 * Alter AI Skill Router
 * @description 범용 Alter 대화 + 특화 Skill(강의계획서 초안·평가 초안 등)
 */

import { Academy } from "../models/Academy.js";
import {
  AiLibraryItem,
  Season,
  School,
  Registration,
  Syllabus,
} from "../models/index.js";
import {
  generateText,
  generateTextStream,
  resolveProvider,
  resolveModel,
} from "./aiProvider.js";
import {
  AI_ERRORS,
  PROMPT_LIMITS,
  FEATURE_PROFILES,
  selectReferencesForPrompt,
  normalizeGuidelines,
  normalizeReferences,
  normalizeExamples,
  normalizeUserInputs,
  extractSyllabusInputFields,
  examplesFromSyllabusInfo,
  buildStyleRubricFromExamples,
  formatCurrentInfoForPrompt,
  parseSyllabusDraftJson,
  buildSyllabusDraftRetryPrompt,
  truncateText,
} from "./aiPromptPolicy.js";
import { maskSensitiveText } from "./aiSafety.js";
import { logAIUsage } from "./aiUsage.js";
import {
  parseEvaluationCsv,
  buildEvaluationCsv,
  isEmptyEval,
} from "../utils/evaluationCsv.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

export const SKILL_IDS = {
  CHAT: "chat",
  SYLLABUS_DRAFT: "syllabus-draft",
  /** @deprecated syllabus-draft 로 교체됨. resolveSkillId 에서 매핑 */
  SYLLABUS_REVIEW: "syllabus-draft",
  EVALUATION_DRAFT: "evaluation-draft",
  ARCHIVE_DRAFT: "archive-draft",
  DOCUMENT_DRAFT: "document-draft",
};

/** @type {Record<string, { id: string, name: string, description: string, profile: string }>} */
export const SKILL_CATALOG = {
  [SKILL_IDS.CHAT]: {
    id: SKILL_IDS.CHAT,
    name: "챗봇",
    description: "학습·작성에 대한 범용 도우미 대화",
    profile: "chat",
  },
  [SKILL_IDS.SYLLABUS_DRAFT]: {
    id: SKILL_IDS.SYLLABUS_DRAFT,
    name: "수업",
    description:
      "제공된 정보·자료를 바탕으로 강의계획서 전 항목 초안을 작성합니다",
    profile: "syllabusDraft",
  },
  [SKILL_IDS.EVALUATION_DRAFT]: {
    id: SKILL_IDS.EVALUATION_DRAFT,
    name: "평가",
    description:
      "자기평가·기존 멘토평가 등을 종합해 선택한 항목의 초안을 새로 작성합니다",
    profile: "evaluationDraft",
  },
  [SKILL_IDS.ARCHIVE_DRAFT]: {
    id: SKILL_IDS.ARCHIVE_DRAFT,
    name: "기록",
    description:
      "학생 기록(행동특성·종합의견 등) 항목의 초안을 작성합니다",
    profile: "archiveDraft",
  },
  [SKILL_IDS.DOCUMENT_DRAFT]: {
    id: SKILL_IDS.DOCUMENT_DRAFT,
    name: "문서",
    description:
      "보드 문서(매뉴얼·공지·회의록 등) 마크다운 초안을 작성·다듬습니다",
    profile: "documentDraft",
  },
};

export const listSkills = () => Object.values(SKILL_CATALOG);

export const resolveSkillId = (raw) => {
  let id = String(raw || SKILL_IDS.CHAT).trim();
  if (id === "syllabus-review") id = SKILL_IDS.SYLLABUS_DRAFT;
  return SKILL_CATALOG[id] ? id : SKILL_IDS.CHAT;
};

/**
 * 학교 aiConfig + 라이브러리 → 스킬별 지침/참고자료 팩.
 * school.aiConfig 가 없으면 시즌 aiSettings 로 fallback.
 */
const hasSchoolSkillConfig = (school) =>
  !!(
    school?.aiConfig?.skills &&
    typeof school.aiConfig.skills === "object" &&
    Object.keys(school.aiConfig.skills).length > 0
  );

const defaultSkillGuide = (skill) => {
  if (skill === SKILL_IDS.EVALUATION_DRAFT) {
    return "학생을 존중하는 공손한 문어체로, 관찰 가능한 사실과 성장 포인트를 2~4문장으로 작성하세요.";
  }
  if (skill === SKILL_IDS.ARCHIVE_DRAFT) {
    return "학생을 존중하는 공손한 문어체로, 관찰 가능한 행동·성장·관계 특성을 2~5문장으로 작성하세요. 추측·낙인·민감정보는 피하세요.";
  }
  if (skill === SKILL_IDS.DOCUMENT_DRAFT) {
    return "학교 문서에 맞는 명확한 마크다운으로 작성하세요. 제목·목록·표·체크리스트를 문서 목적에 맞게 활용하고, 퀴즈·인터랙티브 자료는 ```html-app``` 블록을 사용하세요. 추측·민감정보는 넣지 마세요.";
  }
  return "구체성, 학습목표와 활동 연결, 평가 정합성을 중심으로 도와주세요.";
};

/** 스킬에 선택된 라이브러리 → 지침 블록 / 학습정보 */
const loadSchoolSkillLibraryParts = async (academyId, school, skillConfig) => {
  let learningRefs = [];
  const instructionBlocks = [];
  const ids = Array.isArray(skillConfig?.libraryItemIds)
    ? skillConfig.libraryItemIds.map(String).filter(Boolean)
    : [];
  if (ids.length > 0 && school?._id) {
    const items = await AiLibraryItem(academyId)
      .find({
        _id: { $in: ids },
        school: school._id,
      })
      .lean();
    const byId = new Map(items.map((it) => [String(it._id), it]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
    for (const it of ordered) {
      if (!(it.content || it.title)) continue;
      if (it.kind === "instruction") {
        instructionBlocks.push(
          `### ${it.title || "지침"}\n${truncateText(
            it.content || "",
            PROMPT_LIMITS.REFERENCE_CHARS
          )}`
        );
      } else {
        learningRefs.push({
          title: it.title,
          content: it.content,
        });
      }
    }
    learningRefs = normalizeReferences(learningRefs);
  }
  return { instructionBlocks, learningRefs };
};

export const resolveSkillPromptPack = async (
  academyId,
  school,
  season,
  skillId,
  referenceIndexes
) => {
  const skill = resolveSkillId(skillId);
  const skillConfig = school?.aiConfig?.skills?.[skill] || null;
  const useSchool = hasSchoolSkillConfig(school);

  if (useSchool) {
    const { instructionBlocks, learningRefs } =
      await loadSchoolSkillLibraryParts(academyId, school, skillConfig);

    // 지침은 라이브러리(instruction) 선택이 우선. 없으면 기본 가이드.
    // 레거시 skills.instructions 는 라이브러리 지침이 없을 때만 사용.
    const baseInstructions =
      instructionBlocks.length > 0
        ? ""
        : normalizeGuidelines(
            skillConfig?.instructions || defaultSkillGuide(skill)
          );

    const guidelines = truncateText(
      [baseInstructions, ...instructionBlocks].filter(Boolean).join("\n\n"),
      PROMPT_LIMITS.GUIDELINES_TOTAL_CHARS ||
        PROMPT_LIMITS.GUIDELINES_CHARS * 4
    );

    const skipRefs = skill === SKILL_IDS.SYLLABUS_DRAFT;
    return {
      guidelines,
      references: skipRefs
        ? []
        : selectReferencesForPrompt(learningRefs, referenceIndexes),
      exampleSyllabusIds: skipRefs
        ? []
        : Array.isArray(skillConfig?.exampleSyllabusIds)
          ? skillConfig.exampleSyllabusIds.map(String)
          : [],
      examples: {},
      schoolId: school?._id ? String(school._id) : null,
      fromSchool: true,
    };
  }

  // fallback: 시즌 설정 (마이그레이션 전)
  const skipRefs = skill === SKILL_IDS.SYLLABUS_DRAFT;
  return {
    guidelines: normalizeGuidelines(
      season?.aiSettings?.guidelines || defaultSkillGuide(skill)
    ),
    references: skipRefs
      ? []
      : selectReferencesForPrompt(
          season?.aiSettings?.references || [],
          referenceIndexes
        ),
    exampleSyllabusIds: skipRefs
      ? []
      : Array.isArray(season?.aiSettings?.exampleSyllabusIds)
        ? season.aiSettings.exampleSyllabusIds.map(String)
        : [],
    examples: skipRefs ? {} : season?.aiSettings?.examples || {},
    schoolId: school?._id ? String(school._id) : null,
    fromSchool: false,
  };
};

/**
 * Alter prep UI용 — 저장된 지침/참고자료 (기본 가이드 문구는 넣지 않음).
 * references 는 선택 전 전체 목록(인덱스는 프롬프트와 동일 순서).
 * archive-draft 는 instructionItems + defaultGuidelineItemIds 도 함께 반환.
 */
export const resolveSkillPrepSettings = async (
  academyId,
  school,
  season,
  skillId
) => {
  const skill = resolveSkillId(skillId);
  const skillConfig = school?.aiConfig?.skills?.[skill] || null;
  const useSchool = hasSchoolSkillConfig(school);

  const skipRefs =
    skill === SKILL_IDS.SYLLABUS_DRAFT || skill === SKILL_IDS.DOCUMENT_DRAFT;

  const loadInstructionChoices = async () => {
    if (!school?._id) {
      return { instructionItems: [], defaultGuidelineItemIds: [] };
    }
    const linkedIds = Array.isArray(skillConfig?.libraryItemIds)
      ? skillConfig.libraryItemIds.map(String).filter(Boolean)
      : [];
    const linkedSet = new Set(linkedIds);
    const items = await AiLibraryItem(academyId)
      .find({ school: school._id, kind: "instruction" })
      .select("_id title content skillTags")
      .lean();
    const tagged = [];
    const linked = [];
    const others = [];
    for (const it of items || []) {
      const id = String(it._id);
      const tags = Array.isArray(it.skillTags)
        ? it.skillTags.map(String)
        : [];
      const row = {
        _id: id,
        title: it.title || "지침",
        content: truncateText(it.content || "", 400),
      };
      if (linkedSet.has(id)) linked.push(row);
      else if (tags.includes(skill)) tagged.push(row);
      else others.push(row);
    }
    let instructionItems = [...linked, ...tagged];
    if (instructionItems.length === 0) instructionItems = others;
    const defaultGuidelineItemIds =
      linked.length > 0
        ? linked.map((r) => r._id)
        : tagged.map((r) => r._id);
    return { instructionItems, defaultGuidelineItemIds };
  };

  if (useSchool) {
    const { instructionBlocks, learningRefs } =
      await loadSchoolSkillLibraryParts(academyId, school, skillConfig);
    const baseInstructions =
      instructionBlocks.length > 0
        ? ""
        : normalizeGuidelines(skillConfig?.instructions || "");
    const guidelines = truncateText(
      [baseInstructions, ...instructionBlocks].filter(Boolean).join("\n\n"),
      PROMPT_LIMITS.GUIDELINES_TOTAL_CHARS ||
        PROMPT_LIMITS.GUIDELINES_CHARS * 4
    );
    const base = {
      guidelines,
      references: skipRefs ? [] : learningRefs,
      fromSchool: true,
    };
    if (
      skill === SKILL_IDS.ARCHIVE_DRAFT ||
      skill === SKILL_IDS.DOCUMENT_DRAFT
    ) {
      const choices = await loadInstructionChoices();
      return { ...base, ...choices };
    }
    return base;
  }

  const seasonBase = {
    guidelines: normalizeGuidelines(season?.aiSettings?.guidelines || ""),
    references: skipRefs
      ? []
      : normalizeReferences(season?.aiSettings?.references || []),
    fromSchool: false,
  };
  if (
    skill === SKILL_IDS.ARCHIVE_DRAFT ||
    skill === SKILL_IDS.DOCUMENT_DRAFT
  ) {
    const choices = await loadInstructionChoices();
    return { ...seasonBase, ...choices };
  }
  return seasonBase;
};

/** prep에서 고른 라이브러리 지침(+스킬 기본)으로 guidelines 문자열 구성 */
const resolveLibraryGuidelines = async (
  academyId,
  school,
  season,
  skillId,
  context = {}
) => {
  const skill = resolveSkillId(skillId);
  const skillConfig = school?.aiConfig?.skills?.[skill] || null;
  const requested = Array.isArray(context.guidelineItemIds)
    ? context.guidelineItemIds.map(String).filter(Boolean)
    : [];
  const fallbackLinked = Array.isArray(skillConfig?.libraryItemIds)
    ? skillConfig.libraryItemIds.map(String).filter(Boolean)
    : [];
  const ids = requested.length > 0 ? requested : fallbackLinked;

  if (ids.length > 0 && school?._id) {
    const items = await AiLibraryItem(academyId)
      .find({
        _id: { $in: ids },
        school: school._id,
        kind: "instruction",
      })
      .lean();
    const byId = new Map(items.map((it) => [String(it._id), it]));
    const blocks = ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((it) => {
        const title = String(it.title || "지침").trim();
        const body = String(it.content || "").trim();
        return body ? `### ${title}\n${body}` : "";
      })
      .filter(Boolean);
    if (blocks.length > 0) {
      return truncateText(
        blocks.join("\n\n"),
        PROMPT_LIMITS.GUIDELINES_TOTAL_CHARS ||
          PROMPT_LIMITS.GUIDELINES_CHARS * 4
      );
    }
  }

  const pack = await resolveSkillPromptPack(
    academyId,
    school,
    season,
    skill,
    context?.referenceIndexes
  );
  return pack.guidelines || defaultSkillGuide(skill);
};

const resolveArchiveGuidelines = async (
  academyId,
  school,
  season,
  context = {}
) =>
  resolveLibraryGuidelines(
    academyId,
    school,
    season,
    SKILL_IDS.ARCHIVE_DRAFT,
    context
  );

const resolveDocumentGuidelines = async (
  academyId,
  school,
  season,
  context = {}
) =>
  resolveLibraryGuidelines(
    academyId,
    school,
    season,
    SKILL_IDS.DOCUMENT_DRAFT,
    context
  );

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
  if (err?.code === "AI_TIMEOUT" || err?.status === 504) {
    return AI_ERRORS.GENERATION_FAILED;
  }
  if (err?.status === 404) return AI_ERRORS.MODEL_NOT_FOUND;
  if (err?.status === 401 || err?.status === 403) return AI_ERRORS.INVALID_API_KEY;
  return AI_ERRORS.GENERATION_FAILED;
};

const runEvaluationGeneration = async ({
  provider,
  apiKey,
  modelName,
  profile,
  systemInstruction,
  messages,
  onEvent,
  progressLabel,
}) => {
  const emit = typeof onEvent === "function" ? onEvent : () => {};
  let lastEmit = Date.now();
  let chars = 0;
  const heartbeat = setInterval(() => {
    emit("step", {
      message: `${progressLabel} (대기 중… ${Math.round(
        (Date.now() - lastEmit) / 1000
      )}초)`,
    });
  }, 8000);
  try {
    const result = await generateTextStream(
      {
        provider,
        apiKey,
        model: modelName,
        systemInstruction,
        messages,
        temperature: profile.temperature,
        maxTokens: profile.maxTokens,
      },
      (delta) => {
        chars += String(delta || "").length;
        const now = Date.now();
        if (now - lastEmit >= 4000) {
          emit("step", {
            message: `${progressLabel} (${chars}자 수신)`,
          });
          lastEmit = now;
        }
      }
    );
    return result;
  } finally {
    clearInterval(heartbeat);
  }
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

  let school = null;
  if (season.school) {
    school = await School(academyId).findById(season.school);
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

  const useSchoolPerm = hasSchoolSkillConfig(school);
  const schoolPerm = school?.aiConfig?.permission;
  const seasonPerm = season.aiSettings?.permission;
  const hasPermission =
    registration.role === "teacher"
      ? useSchoolPerm
        ? !!schoolPerm?.teacher
        : !!seasonPerm?.teacher
      : useSchoolPerm
        ? !!schoolPerm?.student
        : !!seasonPerm?.student;

  if (!hasPermission) {
    const err = new Error(PERMISSION_DENIED);
    err.status = 403;
    err.code = PERMISSION_DENIED;
    throw err;
  }

  return { academy, season, school, registration };
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
  promptPack
) => {
  const fieldNames = (fields || []).map((f) =>
    typeof f === "string" ? f : f.name
  );
  let examples = {};
  let sourceLabel = "";
  const schoolId = promptPack?.schoolId || null;

  if (context?.exampleSyllabusId) {
    const exampleSyllabus = await Syllabus(academyId)
      .findById(context.exampleSyllabusId)
      .select("classTitle user season school info")
      .lean();
    const sameSeason =
      exampleSyllabus && String(exampleSyllabus.season) === String(seasonId);
    const sameSchool =
      schoolId &&
      exampleSyllabus &&
      String(exampleSyllabus.school) === String(schoolId);
    const isOwner =
      exampleSyllabus && String(exampleSyllabus.user) === String(userId);
    if (exampleSyllabus && (sameSeason || sameSchool || isOwner)) {
      examples = examplesFromSyllabusInfo(exampleSyllabus.info, fields);
      if (Object.keys(examples).length > 0) {
        sourceLabel = `${isOwner ? "내 계획서" : "모범 계획서"} 「${
          exampleSyllabus.classTitle || "제목 없음"
        }」`;
      }
    }
  }

  if (Object.keys(examples).length === 0) {
    const configuredIds = Array.isArray(promptPack?.exampleSyllabusIds)
      ? promptPack.exampleSyllabusIds
          .map((id) => String(id || "").trim())
          .filter(Boolean)
      : [];
    const merged = {};
    const labels = [];
    for (const id of configuredIds.slice(0, 2)) {
      const exampleSyllabus = await Syllabus(academyId)
        .findById(id)
        .select("classTitle season school info")
        .lean();
      if (!exampleSyllabus) continue;
      const ok = schoolId
        ? String(exampleSyllabus.school) === String(schoolId)
        : String(exampleSyllabus.season) === String(seasonId);
      if (!ok) continue;
      const part = examplesFromSyllabusInfo(exampleSyllabus.info, fields);
      Object.assign(merged, part);
      labels.push(exampleSyllabus.classTitle || "제목 없음");
    }
    if (Object.keys(merged).length > 0) {
      examples = merged;
      sourceLabel =
        labels.length === 1
          ? `모범 계획서 「${labels[0]}」`
          : `모범 계획서 ${labels.map((t) => `「${t}」`).join(" ")}`;
    }
  }

  if (Object.keys(examples).length === 0) {
    examples = normalizeExamples(promptPack?.examples || {}, fieldNames);
    if (Object.keys(examples).length > 0) {
      sourceLabel = "AI 설정 모범 문장";
    }
  }

  return {
    rubric: buildStyleRubricFromExamples(examples),
    sourceLabel,
  };
};

export const buildSyllabusDraftPrompt = (context, promptPack, focusFields) => {
  const fieldNames = (focusFields || []).map((f) =>
    typeof f === "string" ? f : f.name
  );
  const currentInfo = context.currentInfo || {};
  const sourceText = truncateText(
    String(context.sourceText || context.userBrief || "").trim(),
    PROMPT_LIMITS.SYLLABUS_DRAFT_SOURCE_CHARS
  );
  const includeSummary =
    context?.draftChunkIndex === 0 || context?.draftChunkIndex == null;

  let prompt = `당신은 한국 학교 강의계획서 작성 전문가입니다.
교사가 제공한 정보·자료를 바탕으로, 지정된 항목의 초안 문장을 작성하세요.
제공 자료에 근거가 없는 내용은 지어내지 말고 해당 value를 빈 문자열("")로 두세요.
다른 수업의 고유명사·주제를 끌어오지 마세요.
응답은 반드시 하나의 JSON 객체만, 마크다운·코드펜스·설명 문구 없이 출력하세요.

## 작성 지침
${normalizeGuidelines(
  promptPack?.guidelines ||
    "구체성, 학습목표와 활동 연결, 평가 정합성을 중심으로 작성하세요."
)}

## 현재 수업
`;
  if (context.subject?.length) {
    prompt += `- 교과목: ${context.subject.join(" > ")}\n`;
  }
  if (context.classTitle) {
    prompt += `- 수업명: ${context.classTitle}\n`;
  }

  prompt += `
## 교사 제공 자료
${sourceText || "(텍스트 자료 없음 — 수업명·교과와 지침만으로 가능한 범위에서 작성)"}

## 이미 채워진 항목 (참고, 그대로 복사하지 말고 일관되게 작성)
${formatCurrentInfoForPrompt(currentInfo, focusFields) || "(없음)"}

## 작성 대상 항목 (모두 items에 포함, field 이름은 정확히 동일)
${fieldNames.map((name) => `- ${JSON.stringify(name)}`).join("\n")}

## 요청
위 대상 항목을 빠짐없이 items에 넣고 JSON만 출력하세요.
각 value는 해당 필드에 바로 붙여넣을 수 있는 공손한 문어체 초안입니다.
{
  ${
    includeSummary
      ? `"summary": "초안 요약 1~2문장",`
      : `"summary": "",`
  }
  "items": [
    { "field": "위 목록의 항목명", "value": "초안 본문 또는 빈 문자열" }
  ]
}
`;

  return prompt;
};

export const mergeSyllabusDraftChunks = (chunks, fieldNames = []) => {
  const byField = new Map();
  let summary = "";

  for (const chunk of chunks) {
    if (!chunk) continue;
    if (!summary && chunk.summary) summary = chunk.summary;
    for (const item of chunk.items || []) {
      if (!item?.field) continue;
      const prev = byField.get(item.field);
      if (!prev || (!prev.value && item.value)) {
        byField.set(item.field, {
          field: item.field,
          value: String(item.value || "").trim(),
        });
      }
    }
  }

  const items =
    fieldNames.length > 0
      ? fieldNames.map((field) => byField.get(field) || { field, value: "" })
      : [...byField.values()];

  return {
    summary: summary || "제공하신 자료를 바탕으로 강의계획서 초안을 작성했습니다.",
    items,
  };
};

const draftFieldChunk = async ({
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
      draft: parseSyllabusDraftJson(fullText, fieldNames),
      tokenUsage,
    };
  } catch (_) {
    const retryPrompt = buildSyllabusDraftRetryPrompt(fieldNames);
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
      temperature: 0.25,
      maxTokens: profile.maxTokens,
    });
    fullText = retryResult.text || "";
    tokenUsage = mergeTokenUsage(tokenUsage, retryResult.tokenUsage);
    return {
      draft: parseSyllabusDraftJson(fullText, fieldNames),
      tokenUsage,
    };
  }
};

/**
 * syllabus-draft Skill 실행
 * @param {Object} params
 * @param {(event: string, data: any) => void} [params.onEvent]
 */
export const executeSyllabusDraftSkill = async ({
  academyId,
  user,
  academy,
  season,
  school,
  context,
  message,
  onEvent,
}) => {
  const profile = FEATURE_PROFILES.syllabusDraft;
  const emit = typeof onEvent === "function" ? onEvent : () => {};

  emit("step", { message: "작성 자료 확인 중..." });

  const fields = extractSyllabusInputFields(context?.formSyllabus);
  if (fields.length === 0) {
    const err = new Error("작성할 강의계획서 입력 항목이 없습니다.");
    err.code = AI_ERRORS.GENERATION_FAILED;
    err.status = 400;
    throw err;
  }

  const sourceText = truncateText(
    [
      String(context?.sourceText || "").trim(),
      String(message || "").trim(),
    ]
      .filter(Boolean)
      .join("\n\n"),
    PROMPT_LIMITS.SYLLABUS_DRAFT_SOURCE_CHARS
  );

  const allFieldNames = fields.map((f) => f.name);
  const chunkSize = PROMPT_LIMITS.SYLLABUS_DRAFT_CHUNK_FIELDS || 8;
  const fieldChunks = [];
  for (let i = 0; i < fields.length; i += chunkSize) {
    fieldChunks.push(fields.slice(i, i + chunkSize));
  }

  const promptPack = await resolveSkillPromptPack(
    academyId,
    school,
    season,
    SKILL_IDS.SYLLABUS_DRAFT,
    []
  );

  const provider = resolveProvider(academy.aiProvider);
  const modelName = resolveModel(provider, academy.aiModel);

  const draftChunks = [];
  let tokenUsage = null;
  const draftContext = { ...(context || {}), sourceText };

  for (let i = 0; i < fieldChunks.length; i++) {
    const chunkFields = fieldChunks[i];
    const chunkNames = chunkFields.map((f) => f.name);
    emit("step", {
      message:
        fieldChunks.length > 1
          ? `AI가 초안을 작성하고 있습니다... (${i + 1}/${fieldChunks.length})`
          : "AI가 강의계획서 초안을 작성하고 있습니다...",
    });

    const prompt = buildSyllabusDraftPrompt(
      { ...draftContext, draftChunkIndex: i },
      promptPack,
      chunkFields
    );

    try {
      const { draft: chunkDraft, tokenUsage: chunkUsage } =
        await draftFieldChunk({
          provider,
          apiKey: academy.aiApiKey,
          modelName,
          profile,
          prompt,
          fieldNames: chunkNames,
        });
      draftChunks.push(chunkDraft);
      tokenUsage = mergeTokenUsage(tokenUsage, chunkUsage);
    } catch (chunkErr) {
      if (i === 0) throw chunkErr;
      emit("step", {
        message: `일부 항목(${i + 1}/${fieldChunks.length}) 작성을 건너뛰었습니다.`,
      });
      draftChunks.push({
        summary: "",
        items: chunkNames.map((field) => ({ field, value: "" })),
      });
    }
  }

  let merged = mergeSyllabusDraftChunks(draftChunks, allFieldNames);
  merged = {
    summary: maskSensitiveText(merged.summary).text,
    items: merged.items.map((item) => ({
      field: item.field,
      value: maskSensitiveText(item.value || "").text,
    })),
  };

  const filled = merged.items.filter((it) => it.value).length;
  if (filled === 0) {
    const err = new Error(
      "초안을 만들지 못했습니다. 수업 정보나 자료를 더 자세히 입력해 주세요."
    );
    err.code = AI_ERRORS.GENERATION_FAILED;
    err.status = 400;
    throw err;
  }

  logAIUsage(academyId, {
    user,
    provider,
    model: modelName,
    feature: profile.feature,
    success: true,
    tokenUsage,
  });

  const draft = {
    kind: "syllabus",
    summary: merged.summary,
    items: merged.items,
  };

  return {
    draft,
    text: formatSyllabusDraftAsChatText(draft),
    provider,
    modelName,
    tokenUsage,
    skill: SKILL_IDS.SYLLABUS_DRAFT,
  };
};

export const formatSyllabusDraftAsChatText = (draft) => {
  if (!draft) return "초안을 만들지 못했습니다.";
  const items = draft.items || [];
  const filled = items.filter((it) => it.value).length;
  const lines = [
    `**【수업 초안 · ${filled}/${items.length}항목】**`,
    "",
    draft.summary || "",
    "",
    "아래 미리보기를 확인한 뒤 「전체에 반영」을 누르면 학습 계획서에 채워집니다.",
  ];
  return lines.join("\n");
};

/** @deprecated 점검 스킬 제거 — 초안 스킬로 위임 */
export const executeSyllabusReviewSkill = async (params) => {
  const result = await executeSyllabusDraftSkill(params);
  return {
    review: null,
    draft: result.draft,
    text: result.text,
    provider: result.provider,
    modelName: result.modelName,
    tokenUsage: result.tokenUsage,
    skill: SKILL_IDS.SYLLABUS_DRAFT,
  };
};

export const formatReviewAsChatText = (review) => {
  if (review?.items?.[0]?.value != null) {
    return formatSyllabusDraftAsChatText(review);
  }
  return "강의계획서 초안 Skill로 전환되었습니다. 자료를 입력한 뒤 초안을 작성해 주세요.";
};

const buildAlterChatSystem = (promptPack, context, boardTitle) => {
  const guidelines = normalizeGuidelines(
    promptPack?.guidelines ||
      "구체성, 학습목표와 활동 연결, 평가 정합성을 중심으로 도와주세요."
  );
  const refs = promptPack?.references || [];
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

## 학교 작성 지침
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

/** 평가 초안 레코드 구분자 (탭보다 모델이 안정적으로 출력) */
const EVAL_DRAFT_SEP = "|||";

/** 참고/초안 텍스트를 한 줄로 정리 (탭·줄바꿈 제거) */
const flattenEvalText = (text) =>
  String(text || "")
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeDraftValue = (text) => {
  let value = String(text || "")
    .replace(/\\n/gi, " ")
    .replace(/\\t/gi, " ")
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // 전체를 감싼 따옴표만 제거 (내용 중간의 '알고있음' 등은 유지)
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
};

/**
 * 레코드 시작 줄인지 판별 (validIds/validLabels와 일치할 때만)
 * 우선순위: ||| → 탭 → " | "
 */
const matchDraftRecordStart = (line, validIds, validLabels) => {
  const attempts = [
    {
      parts: line.split(EVAL_DRAFT_SEP),
      joinRest: (rest) => rest.join(EVAL_DRAFT_SEP),
    },
    {
      parts: line.split("\t"),
      joinRest: (rest) => rest.join(" "),
    },
    {
      parts: line.split(/\s*\|\s*/),
      joinRest: (rest) => rest.join(" "),
    },
  ];
  for (const attempt of attempts) {
    if (attempt.parts.length < 3) continue;
    const studentId = String(attempt.parts[0] || "").trim();
    const label = String(attempt.parts[1] || "").trim();
    if (!validIds.has(studentId) || !validLabels.has(label)) continue;
    return {
      studentId,
      label,
      value: normalizeDraftValue(attempt.joinRest(attempt.parts.slice(2))),
    };
  }
  return null;
};

/**
 * 줄 단위 초안 응답 파싱
 * 형식: 학생ID|||항목라벨|||초안내용 (탭/" | "도 허용), 마지막 줄 END
 * - 내용에 줄바꿈이 섞여도 이어붙임
 * - END 없이 잘리면 마지막 미완성 레코드만 버림
 */
export const parseEvaluationDraftLines = (text, { validIds, validLabels }) => {
  const raw = String(text || "")
    .replace(/```[a-z]*\r?\n?/gi, "")
    .replace(/```/g, "");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const hasEndMark = lines[lines.length - 1] === "END";
  const dataLines = hasEndMark ? lines.slice(0, -1) : lines;

  const entries = [];
  let current = null;

  for (const line of dataLines) {
    if (line === "END") continue;
    const start = matchDraftRecordStart(line, validIds, validLabels);
    if (start) {
      if (current?.value) entries.push(current);
      current = start;
      continue;
    }
    // 레코드 시작이 아니면 직전 초안의 이어지는 문장으로 취급
    if (current) {
      current.value = normalizeDraftValue(`${current.value} ${line}`);
    }
  }
  if (current?.value) entries.push(current);

  // END 없이 끊긴 응답이면 마지막 레코드는 불완전할 수 있어 제외
  if (!hasEndMark && entries.length > 1) entries.pop();
  else if (!hasEndMark && entries.length === 1) {
    const only = entries[0].value || "";
    if (only.length < 12 || /[,….\s]$/.test(only)) {
      // 너무 짧거나 문장 중간에 끊긴 형태로 보이면 버림
      if (only.length < 40) entries.pop();
    }
  }

  const byStudent = new Map();
  for (const { studentId, label, value } of entries) {
    if (!value) continue;
    if (!byStudent.has(studentId)) byStudent.set(studentId, {});
    const values = byStudent.get(studentId);
    if (values[label] == null) values[label] = value;
  }
  return [...byStudent.entries()].map(([studentId, values]) => ({
    studentId,
    values,
  }));
};

const resolveEvaluationFieldMeta = (formEvaluation, label) =>
  (formEvaluation || []).find((f) => f && f.label === label) || null;

/**
 * evaluation-draft Skill 실행
 */
export const executeEvaluationDraftSkill = async ({
  academyId,
  user,
  academy,
  season,
  school,
  registration,
  context = {},
  message = "",
  onEvent,
}) => {
  const profile = FEATURE_PROFILES.evaluationDraft;
  const emit = typeof onEvent === "function" ? onEvent : () => {};
  const maxStudents = PROMPT_LIMITS.EVAL_DRAFT_MAX_STUDENTS || 30;

  emit("step", { message: "평가 권한 확인 중..." });

  const syllabusId = String(context.syllabusId || "").trim();
  if (!syllabusId) {
    const err = new Error(FIELD_REQUIRED("syllabusId"));
    err.status = 400;
    err.code = FIELD_REQUIRED("syllabusId");
    throw err;
  }

  if (!registration?.permissionEvaluationV2) {
    const err = new Error(PERMISSION_DENIED);
    err.status = 403;
    err.code = PERMISSION_DENIED;
    throw err;
  }

  const syllabus = await Syllabus(academyId).findById(syllabusId).lean();
  if (!syllabus) {
    const err = new Error(__NOT_FOUND("syllabus"));
    err.status = 404;
    err.code = __NOT_FOUND("syllabus");
    throw err;
  }
  if (String(syllabus.season) !== String(season._id)) {
    const err = new Error(PERMISSION_DENIED);
    err.status = 403;
    err.code = PERMISSION_DENIED;
    throw err;
  }

  const isMentor = (syllabus.teachers || []).some(
    (t) => String(t._id) === String(user._id)
  );
  const isManager = user.auth === "manager" || user.auth === "admin";
  if (!isMentor && !isManager) {
    const err = new Error(PERMISSION_DENIED);
    err.status = 403;
    err.code = PERMISSION_DENIED;
    throw err;
  }

  const formEvaluation =
    (Array.isArray(context.formEvaluation) && context.formEvaluation.length > 0
      ? context.formEvaluation
      : null) ||
    registration.formEvaluation ||
    season.formEvaluation ||
    [];

  const teacherEditable = formEvaluation.filter(
    (f) => f?.label && f?.auth?.edit?.teacher
  );
  const teacherEditableByLabel = new Map(
    teacherEditable.map((f) => [f.label, f])
  );

  let targetLabels = Array.isArray(context.targetLabels)
    ? context.targetLabels.map((l) => String(l || "").trim()).filter(Boolean)
    : [];
  if (targetLabels.length === 0) {
    targetLabels = teacherEditable
      .filter((f) => f.type === "input")
      .map((f) => f.label);
  }

  targetLabels = targetLabels.filter((label) => {
    const meta = teacherEditableByLabel.get(label);
    return !!meta;
  });

  if (targetLabels.length === 0) {
    const err = new Error("초안을 작성할 평가 항목이 없습니다.");
    err.status = 400;
    err.code = AI_ERRORS.GENERATION_FAILED;
    throw err;
  }

  // 작성 대상 필드도 기존 값이 있으면 참고로 사용 가능
  const contextLabels = (
    Array.isArray(context.contextLabels) ? context.contextLabels : []
  )
    .map((l) => String(l || "").trim())
    .filter((label) => {
      if (!label) return false;
      return (
        teacherEditableByLabel.has(label) ||
        formEvaluation.some((f) => f?.label === label)
      );
    });

  const fillEmptyOnly = context.fillEmptyOnly !== false;
  const allowedLabels = new Set([
    ...teacherEditable.map((f) => f.label),
    ...formEvaluation.map((f) => f.label).filter(Boolean),
  ]);

  emit("step", { message: "평가 데이터 확인 중..." });

  const { rows: parsedRows } = parseEvaluationCsv(
    context.csv || "",
    allowedLabels
  );
  if (parsedRows.length === 0) {
    const err = new Error("평가 CSV에서 학생 행을 찾지 못했습니다.");
    err.status = 400;
    err.code = AI_ERRORS.GENERATION_FAILED;
    throw err;
  }

  const studentIdFilter = Array.isArray(context.studentIds)
    ? new Set(
        context.studentIds.map((id) => String(id || "").trim()).filter(Boolean)
      )
    : null;

  let workRows = parsedRows;
  if (studentIdFilter && studentIdFilter.size > 0) {
    workRows = workRows.filter((r) => studentIdFilter.has(r.studentId));
  }

  if (fillEmptyOnly) {
    workRows = workRows.filter((r) =>
      targetLabels.some((label) => isEmptyEval(r.evaluation?.[label]))
    );
  }

  workRows = workRows.slice(0, maxStudents);
  if (workRows.length === 0) {
    const err = new Error(
      fillEmptyOnly
        ? "채울 빈 칸이 있는 학생이 없습니다."
        : "초안을 작성할 학생이 없습니다."
    );
    err.status = 400;
    err.code = AI_ERRORS.GENERATION_FAILED;
    throw err;
  }

  const classTitle =
    context.classTitle || syllabus.classTitle || "수업";
  const promptPack = await resolveSkillPromptPack(
    academyId,
    school,
    season,
    SKILL_IDS.EVALUATION_DRAFT,
    context?.referenceIndexes
  );
  const guidelines = promptPack.guidelines;

  const schemaLines = targetLabels.map((label) => {
    const meta = resolveEvaluationFieldMeta(formEvaluation, label);
    const type = meta?.type || "input";
    if (type === "select") {
      const opts = (meta.options || []).join(" | ");
      return `- ${label} (select, 옵션: ${opts || "없음"})`;
    }
    if (type === "input-number") {
      return `- ${label} (number)`;
    }
    return `- ${label} (text)`;
  });

  const userHint = truncateText(
    String(message || "").trim(),
    PROMPT_LIMITS.EVAL_DRAFT_USER_HINT_CHARS ||
      PROMPT_LIMITS.USER_GOAL_CHARS ||
      1800
  );

  const buildStudentBlocks = (rows) =>
    rows.map((row, idx) => {
      const contextParts = contextLabels
        .map((label) => {
          // 줄바꿈·탭을 미리 제거해 모델이 구조를 흉내 내지 않게 함
          const val = truncateText(
            flattenEvalText(row.evaluation?.[label] || ""),
            PROMPT_LIMITS.EVAL_DRAFT_CONTEXT_CHARS
          );
          return val ? `  - ${label}: ${val}` : null;
        })
        .filter(Boolean);
      const emptyTargets = targetLabels.filter((label) =>
        fillEmptyOnly ? isEmptyEval(row.evaluation?.[label]) : true
      );
      return [
        `### 학생 ${idx + 1}`,
        `- ID: ${row.studentId}`,
        `- 이름: ${row.studentName || ""}`,
        `- 학년: ${row.studentGrade || ""}`,
        contextParts.length
          ? `참고 평가(사실·성장 포인트 종합용. 문장을 그대로 복사하지 말 것):\n${contextParts.join(
              "\n"
            )}`
          : "참고 평가: (없음)",
        fillEmptyOnly
          ? `작성할 항목(비어 있는 칸만): ${
              emptyTargets.join(", ") || "(없음)"
            }`
          : `작성할 항목(참고를 종합해 교사 시점으로 새로 쓸 칸): ${
              emptyTargets.join(", ") || "(없음)"
            }`,
      ].join("\n");
    });

  const provider = resolveProvider(academy.aiProvider);
  const modelName = resolveModel(provider, academy.aiModel);
  const systemInstruction = `You are Alter, an evaluation drafting assistant. Synthesize reference evaluations into a NEW teacher-voice draft. Never copy reference sentences verbatim. Output only data lines: studentId${EVAL_DRAFT_SEP}label${EVAL_DRAFT_SEP}draft, then END.`;

  // 한 묶음의 칸 수(학생 × 작성 항목)를 제한해 응답 잘림을 방지
  const cellBudget = Math.max(1, PROMPT_LIMITS.EVAL_DRAFT_CHUNK_CELLS || 12);
  const chunkSize = Math.min(
    Math.max(1, PROMPT_LIMITS.EVAL_DRAFT_CHUNK_SIZE || 10),
    Math.max(3, Math.floor(cellBudget / Math.max(1, targetLabels.length)))
  );
  const chunks = [];
  for (let i = 0; i < workRows.length; i += chunkSize) {
    chunks.push(workRows.slice(i, i + chunkSize));
  }

  const rewriteMode = !fillEmptyOnly;
  const taskRules = rewriteMode
    ? `역할: 참고 평가(자기평가·기존 멘토평가 등)를 종합해 작성 항목을 교사 시점으로 새로 작성합니다.
- 참고 문장을 그대로 복사·붙여넣기·약간만 바꿔 쓰지 마세요. 반드시 새 문장으로 재작성하세요.
- 자기평가의 1인칭("나는~")을 교사 평가 문체("학생이~", "~함")로 바꾸세요.
- 기존 멘토평가가 참고에 있어도 그것을 유지하지 말고, 자기평가와 합쳐 통합된 새 멘토평가를 쓰세요.
- 사실·성장 포인트·관찰 가능한 행동만 남기고 중복은 줄이세요.
- 지정된 학생·작성 항목만 출력하세요.`
    : `역할: 참고 평가를 바탕으로 비어 있는 작성 항목만 교사 시점으로 초안을 씁니다.
- 참고 문장을 그대로 복사하지 말고 새 문장으로 작성하세요.
- 자기평가의 1인칭을 교사 평가 문체로 바꾸세요.
- 이미 값이 있는 작성 칸은 출력하지 마세요.
- 지정된 학생·작성 항목만 출력하세요.`;

  // 공통 컨텍스트는 앞부분에 고정 배치 (provider 프롬프트 캐시 활용)
  const sharedPrompt = `당신은 학교 수업 평가 작성 보조입니다. 교사가 검토·수정할 초안만 작성합니다.

${taskRules}

## 수업
${classTitle}

## 작성 지침
${guidelines}

## 작성할 항목 스키마
${schemaLines.join("\n")}

## 교사 요청
${
  userHint ||
  (rewriteMode
    ? "참고 평가를 종합해 교사 시점 초안을 새로 작성해 주세요."
    : "빈 칸에 간결한 초안을 작성해 주세요.")
}

## 출력 형식 (필수)
- 한 줄에 한 칸씩: 학생ID${EVAL_DRAFT_SEP}항목라벨${EVAL_DRAFT_SEP}초안내용
- 예시: 1253${EVAL_DRAFT_SEP}멘토평가${EVAL_DRAFT_SEP}수업에서 주도성과 메타인지를 연결해 성찰하는 모습이 관찰되었습니다.
- 구분자 ${EVAL_DRAFT_SEP} 는 정확히 세 개의 세로줄(|)입니다. 내용 안에는 ${EVAL_DRAFT_SEP}·탭·줄바꿈을 넣지 마세요.
- 따옴표(' ")는 써도 되지만 초안 전체를 따옴표로 감싸지 마세요.
- 각 내용은 2~4문장으로 간결하게, 반드시 한 줄로 작성하세요. 주차별·목록형으로 줄을 나누지 마세요.
- 설명·마크다운·머리글·JSON 없이 데이터 줄만 출력하세요.
- 모든 칸을 출력한 뒤 마지막 줄에 END 만 출력하세요.`;

  const validLabels = new Set(targetLabels);
  let tokenUsage = null;
  const aiParsedRows = [];
  const chunkErrors = [];
  let doneStudents = 0;

  emit("step", {
    message: `AI가 평가 초안을 작성하고 있습니다... (학생 ${workRows.length}명, ${chunks.length}묶음 동시 처리)`,
  });

  const runChunk = async (idx) => {
    const chunkRows = chunks[idx];
    const validIds = new Set(chunkRows.map((r) => r.studentId));
    const prompt = `${sharedPrompt}

## 학생 목록 (${chunkRows.length}명)
${buildStudentBlocks(chunkRows).join("\n\n")}

이번에 출력할 학생 ID: ${chunkRows.map((r) => r.studentId).join(", ")}
작성할 항목 라벨: ${targetLabels.join(", ")}`;

    const generated = await runEvaluationGeneration({
      provider,
      apiKey: academy.aiApiKey,
      modelName,
      profile,
      systemInstruction,
      messages: [{ role: "user", content: prompt }],
      onEvent: emit,
      progressLabel: `평가 초안 작성 중 (${idx + 1}/${chunks.length}묶음)`,
    });
    tokenUsage = mergeTokenUsage(tokenUsage, generated.tokenUsage);
    return parseEvaluationDraftLines(generated.text || "", {
      validIds,
      validLabels,
    });
  };

  let nextChunk = 0;
  const worker = async () => {
    while (nextChunk < chunks.length) {
      const idx = nextChunk;
      nextChunk += 1;
      try {
        const rows = await runChunk(idx);
        if (rows.length > 0) {
          aiParsedRows.push(...rows);
          doneStudents += rows.length;
          emit("step", {
            message: `초안 생성 진행: ${doneStudents}/${workRows.length}명 완료`,
          });
        } else {
          emit("step", {
            message: `${idx + 1}묶음 응답을 해석하지 못해 건너뜁니다.`,
          });
        }
      } catch (err) {
        if (err?.code === "AI_TIMEOUT") {
          err.message =
            err.message ||
            "AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
        }
        if (!err.code) err.code = mapProviderError(err);
        chunkErrors.push(err);
        emit("step", {
          message: `${idx + 1}묶음 생성에 실패해 건너뜁니다.`,
        });
      }
    }
  };

  const concurrency = Math.max(1, PROMPT_LIMITS.EVAL_DRAFT_CONCURRENCY || 3);
  await Promise.all(
    Array.from({ length: Math.min(concurrency, chunks.length) }, worker)
  );

  if (!aiParsedRows.length) {
    const err = chunkErrors[0] || new Error(AI_ERRORS.INVALID_JSON);
    if (!err.code) err.code = AI_ERRORS.INVALID_JSON;
    if (!err.status) err.status = 502;
    logAIUsage(academyId, {
      user,
      provider,
      model: modelName,
      feature: profile.feature,
      success: false,
      errorCode: err.code,
      tokenUsage,
    });
    throw err;
  }

  const workById = new Map(workRows.map((r) => [r.studentId, r]));
  const draftRows = [];
  const compactEvalText = (text) =>
    flattenEvalText(text).replace(/\s+/g, "").toLowerCase();
  /** 참고/기존 칸을 그대로 복사한 응답은 초안에서 제외 */
  const isNearCopyOfReferences = (draftText, srcRow, targetLabel) => {
    const draftCompact = compactEvalText(draftText);
    if (draftCompact.length < 20) return false;
    const sources = [];
    if (!isEmptyEval(srcRow.evaluation?.[targetLabel])) {
      sources.push(srcRow.evaluation[targetLabel]);
    }
    for (const label of contextLabels) {
      if (!isEmptyEval(srcRow.evaluation?.[label])) {
        sources.push(srcRow.evaluation[label]);
      }
    }
    for (const srcText of sources) {
      const srcCompact = compactEvalText(srcText);
      if (!srcCompact) continue;
      if (draftCompact === srcCompact) return true;
      // 긴 원문의 연속 구간을 거의 그대로 쓴 경우
      if (
        draftCompact.length >= 40 &&
        srcCompact.includes(draftCompact) &&
        draftCompact.length / srcCompact.length >= 0.5
      ) {
        return true;
      }
      if (
        srcCompact.length >= 40 &&
        draftCompact.includes(srcCompact) &&
        srcCompact.length / draftCompact.length >= 0.7
      ) {
        return true;
      }
    }
    return false;
  };

  for (const row of aiParsedRows) {
    const studentId = String(row?.studentId || "").trim();
    if (!studentId || !workById.has(studentId)) continue;
    const src = workById.get(studentId);
    const rawValues =
      row.values && typeof row.values === "object" ? row.values : {};
    const values = {};

    for (const label of targetLabels) {
      if (fillEmptyOnly && !isEmptyEval(src.evaluation?.[label])) continue;
      let val = rawValues[label];
      if (val == null) continue;
      val = maskSensitiveText(String(val)).text;
      val = truncateText(val, PROMPT_LIMITS.EVAL_DRAFT_CELL_CHARS).trim();
      if (!val) continue;
      if (isNearCopyOfReferences(val, src, label)) continue;

      const meta = teacherEditableByLabel.get(label);
      if (meta?.type === "select") {
        const options = (meta.options || []).map(String);
        if (!options.includes(val)) continue;
      } else if (meta?.type === "input-number") {
        if (!/^-?\d+(\.\d+)?$/.test(val)) continue;
      }

      values[label] = val;
    }

    if (Object.keys(values).length === 0) continue;
    draftRows.push({
      studentId,
      studentName: src.studentName || "",
      studentGrade: src.studentGrade || "",
      values,
    });
  }

  if (draftRows.length === 0) {
    const err = new Error("생성 가능한 초안이 없습니다. 다시 시도해 주세요.");
    err.status = 502;
    err.code = AI_ERRORS.EMPTY_RESPONSE;
    logAIUsage(academyId, {
      user,
      provider,
      model: modelName,
      feature: profile.feature,
      success: false,
      errorCode: err.code,
      tokenUsage,
    });
    throw err;
  }

  const csv = buildEvaluationCsv(draftRows, targetLabels);
  const summary = `${draftRows.length}명 · ${targetLabels.join(
    ", "
  )} 초안을 만들었습니다.`;

  logAIUsage(academyId, {
    user,
    provider,
    model: modelName,
    feature: profile.feature,
    success: true,
    tokenUsage,
  });

  return {
    skill: SKILL_IDS.EVALUATION_DRAFT,
    provider,
    modelName,
    tokenUsage,
    text: summary,
    draft: {
      targetLabels,
      fillEmptyOnly,
      csv,
      rows: draftRows.map((r) => ({
        studentId: r.studentId,
        studentName: r.studentName || "",
        studentGrade: r.studentGrade || "",
        values: r.values,
      })),
    },
  };
};

/**
 * 동일 문구 모드 파싱: 항목라벨|||초안내용 (+ END)
 */
const parseSameTextArchiveDraftLines = (text, { validLabels }) => {
  const raw = String(text || "")
    .replace(/```[a-z]*\r?\n?/gi, "")
    .replace(/```/g, "");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const hasEndMark = lines[lines.length - 1] === "END";
  const dataLines = hasEndMark ? lines.slice(0, -1) : lines;
  const values = {};
  let current = null;
  for (const line of dataLines) {
    if (line === "END") continue;
    const parts = line.split(EVAL_DRAFT_SEP);
    if (parts.length >= 2) {
      const label = String(parts[0] || "").trim();
      if (validLabels.has(label)) {
        if (current?.label && current.value) {
          values[current.label] = current.value;
        }
        current = {
          label,
          value: normalizeDraftValue(parts.slice(1).join(EVAL_DRAFT_SEP)),
        };
        continue;
      }
    }
    if (current) {
      current.value = normalizeDraftValue(`${current.value} ${line}`);
    }
  }
  if (current?.label && current.value) {
    values[current.label] = current.value;
  }
  return values;
};

/**
 * archive-draft Skill 실행 (object 기록 양식)
 */
export const executeArchiveDraftSkill = async ({
  academyId,
  user,
  academy,
  season,
  school,
  registration,
  context = {},
  message = "",
  onEvent,
}) => {
  const profile = FEATURE_PROFILES.archiveDraft;
  const emit = typeof onEvent === "function" ? onEvent : () => {};
  const maxStudents = PROMPT_LIMITS.ARCHIVE_DRAFT_MAX_STUDENTS || 30;

  emit("step", { message: "기록 권한 확인 중..." });

  const archiveLabel = String(
    context.archiveLabel || context.label || ""
  ).trim();
  if (!archiveLabel) {
    const err = new Error(FIELD_REQUIRED("archiveLabel"));
    err.status = 400;
    err.code = FIELD_REQUIRED("archiveLabel");
    throw err;
  }

  const formItem = (school?.formArchive || []).find(
    (fa) => fa && fa.label === archiveLabel
  );
  if (!formItem) {
    const err = new Error(__NOT_FOUND("formArchive_Item"));
    err.status = 404;
    err.code = __NOT_FOUND("formArchive_Item");
    throw err;
  }

  const isManager =
    (user.auth === "manager" || user.auth === "admin") &&
    formItem.authManager === "viewAndEdit";
  const teacherAuth = formItem.authTeacher;
  const isTeacherEditor =
    registration?.role === "teacher" &&
    (teacherAuth === "viewAndEditStudents" ||
      teacherAuth === "viewAndEditMyStudents");
  if (!isManager && !isTeacherEditor) {
    const err = new Error(PERMISSION_DENIED);
    err.status = 403;
    err.code = PERMISSION_DENIED;
    throw err;
  }

  const formFields =
    (Array.isArray(context.formArchive) && context.formArchive.length > 0
      ? context.formArchive
      : null) ||
    formItem.fields ||
    [];
  const inputFields = formFields.filter(
    (f) => f?.label && f.type === "input"
  );
  const referenceFields = formFields.filter(
    (f) =>
      f?.label &&
      (f.type === "input" || f.type === "input-number" || f.type === "select")
  );
  const inputByLabel = new Map(inputFields.map((f) => [f.label, f]));
  const referenceByLabel = new Map(referenceFields.map((f) => [f.label, f]));

  let targetLabels = Array.isArray(context.targetLabels)
    ? context.targetLabels.map((l) => String(l || "").trim()).filter(Boolean)
    : [];
  if (targetLabels.length === 0) {
    targetLabels = inputFields.map((f) => f.label);
  }
  targetLabels = targetLabels.filter((label) => inputByLabel.has(label));
  if (targetLabels.length === 0) {
    const err = new Error("초안을 작성할 기록 항목이 없습니다.");
    err.status = 400;
    err.code = AI_ERRORS.GENERATION_FAILED;
    throw err;
  }

  let contextLabels = (
    Array.isArray(context.contextLabels) ? context.contextLabels : []
  )
    .map((l) => String(l || "").trim())
    .filter((label) => label && referenceByLabel.has(label));
  // 미지정이면 작성 대상(+참고 가능 항목)의 기존 내용을 기본 참고
  if (contextLabels.length === 0) {
    contextLabels = [
      ...new Set([...targetLabels, ...referenceFields.map((f) => f.label)]),
    ];
  }

  const fillEmptyOnly = context.fillEmptyOnly !== false;
  const writeMode =
    context.writeMode === "sameText" ? "sameText" : "perStudent";

  emit("step", { message: "기록 데이터 확인 중..." });

  const rawRows = Array.isArray(context.rows) ? context.rows : [];
  const studentIdFilter = Array.isArray(context.studentIds)
    ? new Set(
        context.studentIds.map((id) => String(id || "").trim()).filter(Boolean)
      )
    : null;

  let workRows = rawRows
    .map((r) => ({
      studentId: String(r?.studentId || "").trim(),
      studentName: r?.studentName || "",
      studentGrade: r?.studentGrade || "",
      registrationId: r?.registrationId
        ? String(r.registrationId)
        : undefined,
      values:
        r?.values && typeof r.values === "object" ? r.values : {},
    }))
    .filter((r) => r.studentId);

  if (studentIdFilter && studentIdFilter.size > 0) {
    workRows = workRows.filter((r) => studentIdFilter.has(r.studentId));
  }

  // 담당 학생만 가능한 양식이면 등록정보로 필터
  if (!isManager && teacherAuth === "viewAndEditMyStudents") {
    const regs = await Registration(academyId)
      .find({
        season: season._id,
        role: "student",
        $or: [{ teacher: user._id }, { subTeacher: user._id }],
      })
      .select("user")
      .lean();
    const allowedUsers = new Set(regs.map((r) => String(r.user)));
    workRows = workRows.filter((r) => allowedUsers.has(r.studentId));
  }

  if (workRows.length === 0) {
    const err = new Error("초안을 작성할 학생이 없습니다.");
    err.status = 400;
    err.code = AI_ERRORS.GENERATION_FAILED;
    throw err;
  }

  if (fillEmptyOnly) {
    workRows = workRows.filter((r) =>
      targetLabels.some((label) => isEmptyEval(r.values?.[label]))
    );
    if (workRows.length === 0) {
      const err = new Error(
        "채울 빈 칸이 있는 학생이 없습니다. 「빈 칸만 채우기」를 끄거나 미작성 학생을 선택해 주세요."
      );
      err.status = 400;
      err.code = AI_ERRORS.GENERATION_FAILED;
      throw err;
    }
  }

  workRows = workRows.slice(0, maxStudents);

  const guidelines = await resolveArchiveGuidelines(
    academyId,
    school,
    season,
    context
  );
  const userHint = truncateText(
    String(message || "").trim(),
    PROMPT_LIMITS.ARCHIVE_DRAFT_USER_HINT_CHARS || 1800
  );

  const schemaLines = targetLabels.map((label) => `- ${label} (text)`);
  const provider = resolveProvider(academy.aiProvider);
  const modelName = resolveModel(provider, academy.aiModel);
  const validLabels = new Set(targetLabels);
  let tokenUsage = null;

  const buildContextLines = (row) =>
    contextLabels
      .map((label) => {
        const val = truncateText(
          flattenEvalText(row.values?.[label] || ""),
          PROMPT_LIMITS.ARCHIVE_DRAFT_CONTEXT_CHARS
        );
        if (!val) return null;
        const isTarget = targetLabels.includes(label);
        return `  - ${label}${isTarget ? " (작성 대상 기존값)" : ""}: ${val}`;
      })
      .filter(Boolean);

  const finalizeValues = (rawValues, srcRow) => {
    const values = {};
    for (const label of targetLabels) {
      if (fillEmptyOnly && !isEmptyEval(srcRow?.values?.[label])) continue;
      let val = rawValues?.[label];
      if (val == null) continue;
      val = maskSensitiveText(String(val)).text;
      val = truncateText(val, PROMPT_LIMITS.ARCHIVE_DRAFT_CELL_CHARS).trim();
      if (!val) continue;
      values[label] = val;
    }
    return values;
  };

  let draftRows = [];

  if (writeMode === "sameText") {
    emit("step", {
      message: `AI가 공통 기록 문구를 작성하고 있습니다... (적용 ${workRows.length}명)`,
    });
    const sampleNotes = workRows
      .slice(0, 5)
      .map((row, idx) => {
        const notes = buildContextLines(row);
        return [
          `### 예시 학생 ${idx + 1}`,
          `- 이름: ${row.studentName || ""}`,
          `- 학년: ${row.studentGrade || ""}`,
          notes.length
            ? `기존 내용(참고만, 복사 금지):\n${notes.join("\n")}`
            : "기존 내용: (없음)",
        ].join("\n");
      })
      .join("\n\n");

    const prompt = `당신은 학교 생활기록 작성 보조입니다. 선택한 모든 학생에게 동일하게 넣을 문구 초안을 만듭니다.

역할:
- 아래에 주어진 기존 기록 내용을 참고하되, 문장을 그대로 복사하지 마세요.
- 개인 특성이 드러나지 않게 일반화한 공통 문구로 작성하세요.

## 기록 양식
${archiveLabel}

## 작성 지침
${guidelines || defaultSkillGuide(SKILL_IDS.ARCHIVE_DRAFT)}

## 작성할 항목
${schemaLines.join("\n")}

## 참고할 항목
${contextLabels.join(", ") || "(없음)"}

## 교사 요청
${userHint || "선택 학생 전원에게 쓸 동일한 기록 문구를 작성해 주세요."}

## 참고(개인 특성이 드러나지 않게 일반화)
${sampleNotes || "(없음)"}

## 출력 형식 (필수)
- 한 줄에 한 칸: 항목라벨${EVAL_DRAFT_SEP}초안내용
- 구분자 ${EVAL_DRAFT_SEP} 는 정확히 세 개의 세로줄(|)입니다. 내용에 ${EVAL_DRAFT_SEP}·줄바꿈을 넣지 마세요.
- 학생 이름·개별 사실을 넣지 말고, 전원에게 공통으로 쓸 수 있는 문장으로 쓰세요.
- 설명·마크다운·JSON 없이 데이터 줄만 출력하고 마지막 줄에 END 를 출력하세요.`;

    try {
      const generated = await runEvaluationGeneration({
        provider,
        apiKey: academy.aiApiKey,
        modelName,
        profile,
        systemInstruction: `You are Alter, a school archive drafting assistant. Write ONE shared draft phrase per field for all selected students. Output label${EVAL_DRAFT_SEP}draft lines then END.`,
        messages: [{ role: "user", content: prompt }],
        onEvent: emit,
        progressLabel: "공통 기록 문구 작성 중",
      });
      tokenUsage = mergeTokenUsage(tokenUsage, generated.tokenUsage);
      const shared = parseSameTextArchiveDraftLines(generated.text || "", {
        validLabels,
      });
      const sharedValues = finalizeValues(shared, { values: {} });
      if (Object.keys(sharedValues).length === 0) {
        const err = new Error("생성 가능한 초안이 없습니다. 다시 시도해 주세요.");
        err.status = 502;
        err.code = AI_ERRORS.EMPTY_RESPONSE;
        throw err;
      }
      draftRows = workRows.map((row) => ({
        studentId: row.studentId,
        studentName: row.studentName || "",
        studentGrade: row.studentGrade || "",
        values: finalizeValues(sharedValues, row),
      })).filter((r) => Object.keys(r.values).length > 0);
    } catch (err) {
      if (!err.code) err.code = mapProviderError(err);
      logAIUsage(academyId, {
        user,
        provider,
        model: modelName,
        feature: profile.feature,
        success: false,
        errorCode: err.code,
        tokenUsage,
      });
      throw err;
    }
  } else {
    const cellBudget = Math.max(
      1,
      PROMPT_LIMITS.ARCHIVE_DRAFT_CHUNK_CELLS || 12
    );
    const chunkSize = Math.min(
      Math.max(1, PROMPT_LIMITS.ARCHIVE_DRAFT_CHUNK_SIZE || 10),
      Math.max(3, Math.floor(cellBudget / Math.max(1, targetLabels.length)))
    );
    const chunks = [];
    for (let i = 0; i < workRows.length; i += chunkSize) {
      chunks.push(workRows.slice(i, i + chunkSize));
    }

    const sharedPrompt = `당신은 학교 생활기록 작성 보조입니다. 교사가 검토·수정할 초안만 작성합니다.

역할: 학생별로 차별화된 기록 문구를 작성합니다.
- 참고 항목에 적힌 기존 내용을 사실·성장 포인트로 종합해 작성 항목을 새로 쓰세요.
- 참고 문장을 그대로 복사·붙여넣기 하지 마세요.
- 관찰 가능한 행동·성장·관계 특성을 중심으로 쓰세요.
- 추측·낙인·민감정보(주소, 연락처, 의료 등)를 쓰지 마세요.
- 지정된 학생·작성 항목만 출력하세요.
${fillEmptyOnly ? "- 이미 값이 있는 작성 칸은 출력하지 마세요." : ""}

## 기록 양식
${archiveLabel}

## 작성 지침
${guidelines || defaultSkillGuide(SKILL_IDS.ARCHIVE_DRAFT)}

## 작성할 항목
${schemaLines.join("\n")}

## 참고할 항목
${contextLabels.join(", ") || "(없음)"}

## 교사 요청
${userHint || "학생별 특성을 반영한 기록 초안을 작성해 주세요."}

## 출력 형식 (필수)
- 한 줄에 한 칸: 학생ID${EVAL_DRAFT_SEP}항목라벨${EVAL_DRAFT_SEP}초안내용
- 구분자 ${EVAL_DRAFT_SEP} 는 정확히 세 개의 세로줄(|)입니다. 내용에 ${EVAL_DRAFT_SEP}·탭·줄바꿈을 넣지 마세요.
- 각 내용은 2~5문장으로 간결하게 한 줄로 작성하세요.
- 설명·마크다운·JSON 없이 데이터 줄만 출력하고 마지막 줄에 END 를 출력하세요.`;

    emit("step", {
      message: `AI가 기록 초안을 작성하고 있습니다... (학생 ${workRows.length}명, ${chunks.length}묶음)`,
    });

    const aiParsedRows = [];
    const chunkErrors = [];
    let doneStudents = 0;

    const runChunk = async (idx) => {
      const chunkRows = chunks[idx];
      const validIds = new Set(chunkRows.map((r) => r.studentId));
      const studentBlocks = chunkRows
        .map((row, i) => {
          const notes = buildContextLines(row);
          const emptyTargets = targetLabels.filter((label) =>
            fillEmptyOnly ? isEmptyEval(row.values?.[label]) : true
          );
          return [
            `### 학생 ${i + 1}`,
            `- ID: ${row.studentId}`,
            `- 이름: ${row.studentName || ""}`,
            `- 학년: ${row.studentGrade || ""}`,
            notes.length
              ? `참고 기록(사실·성장 포인트 종합용. 문장 복사 금지):\n${notes.join(
                  "\n"
                )}`
              : "참고 기록: (없음)",
            `작성할 항목: ${emptyTargets.join(", ") || "(없음)"}`,
          ].join("\n");
        })
        .join("\n\n");

      const prompt = `${sharedPrompt}

## 학생 목록 (${chunkRows.length}명)
${studentBlocks}

이번에 출력할 학생 ID: ${chunkRows.map((r) => r.studentId).join(", ")}
작성할 항목 라벨: ${targetLabels.join(", ")}
참고할 항목 라벨: ${contextLabels.join(", ")}`;

      const generated = await runEvaluationGeneration({
        provider,
        apiKey: academy.aiApiKey,
        modelName,
        profile,
        systemInstruction: `You are Alter, a school archive drafting assistant. Synthesize selected reference archive fields into NEW per-student drafts. Never copy reference sentences verbatim. Output studentId${EVAL_DRAFT_SEP}label${EVAL_DRAFT_SEP}draft lines then END.`,
        messages: [{ role: "user", content: prompt }],
        onEvent: emit,
        progressLabel: `기록 초안 작성 중 (${idx + 1}/${chunks.length}묶음)`,
      });
      tokenUsage = mergeTokenUsage(tokenUsage, generated.tokenUsage);
      return parseEvaluationDraftLines(generated.text || "", {
        validIds,
        validLabels,
      });
    };

    let nextChunk = 0;
    const worker = async () => {
      while (nextChunk < chunks.length) {
        const idx = nextChunk;
        nextChunk += 1;
        try {
          const rows = await runChunk(idx);
          if (rows.length > 0) {
            aiParsedRows.push(...rows);
            doneStudents += rows.length;
            emit("step", {
              message: `초안 생성 진행: ${doneStudents}/${workRows.length}명 완료`,
            });
          }
        } catch (err) {
          if (!err.code) err.code = mapProviderError(err);
          chunkErrors.push(err);
          emit("step", {
            message: `${idx + 1}묶음 생성에 실패해 건너뜁니다.`,
          });
        }
      }
    };

    const concurrency = Math.max(
      1,
      PROMPT_LIMITS.ARCHIVE_DRAFT_CONCURRENCY || 3
    );
    await Promise.all(
      Array.from({ length: Math.min(concurrency, chunks.length) }, worker)
    );

    if (!aiParsedRows.length) {
      const err = chunkErrors[0] || new Error(AI_ERRORS.INVALID_JSON);
      if (!err.code) err.code = AI_ERRORS.INVALID_JSON;
      if (!err.status) err.status = 502;
      logAIUsage(academyId, {
        user,
        provider,
        model: modelName,
        feature: profile.feature,
        success: false,
        errorCode: err.code,
        tokenUsage,
      });
      throw err;
    }

    const workById = new Map(workRows.map((r) => [r.studentId, r]));
    for (const row of aiParsedRows) {
      const studentId = String(row?.studentId || "").trim();
      if (!studentId || !workById.has(studentId)) continue;
      const src = workById.get(studentId);
      const values = finalizeValues(row.values || {}, src);
      if (Object.keys(values).length === 0) continue;
      draftRows.push({
        studentId,
        studentName: src.studentName || "",
        studentGrade: src.studentGrade || "",
        values,
      });
    }
  }

  if (draftRows.length === 0) {
    const err = new Error("생성 가능한 초안이 없습니다. 다시 시도해 주세요.");
    err.status = 502;
    err.code = AI_ERRORS.EMPTY_RESPONSE;
    logAIUsage(academyId, {
      user,
      provider,
      model: modelName,
      feature: profile.feature,
      success: false,
      errorCode: err.code,
      tokenUsage,
    });
    throw err;
  }

  const summary =
    writeMode === "sameText"
      ? `${draftRows.length}명에게 동일 문구 초안을 만들었습니다. (${targetLabels.join(
          ", "
        )})`
      : `${draftRows.length}명 · ${targetLabels.join(", ")} 기록 초안을 만들었습니다.`;

  logAIUsage(academyId, {
    user,
    provider,
    model: modelName,
    feature: profile.feature,
    success: true,
    tokenUsage,
  });

  return {
    skill: SKILL_IDS.ARCHIVE_DRAFT,
    provider,
    modelName,
    tokenUsage,
    text: summary,
    draft: {
      kind: "archive",
      writeMode,
      targetLabels,
      fillEmptyOnly,
      rows: draftRows,
    },
  };
};

const DOCUMENT_DOC_TYPES = {
  manual: "매뉴얼·안내문",
  notice: "공지",
  minutes: "회의록",
  checklist: "체크리스트",
  table: "표 중심 안내",
  lesson: "학습 자료",
  general: "일반 문서",
};

/** 응답 전체를 감싼 ```markdown ... ``` 한 겹만 제거 (본문 코드펜스는 유지) */
const unwrapOuterMarkdownFence = (text) => {
  const t = String(text || "").trim();
  const m = t.match(/^```(?:markdown|md)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/i);
  return m ? m[1].trim() : t;
};

/**
 * 에디터가 렌더할 수 있도록, 펜스 없이 나온 인터랙티브 HTML을 ```html-app```으로 감싼다.
 */
export const normalizeDocumentDraftContent = (content) => {
  const text = unwrapOuterMarkdownFence(content);
  if (!text.trim()) return text;
  // 이미 html-app을 쓰면 그대로 (모델이 올바르게 작성한 경우)
  if (/```html-app(?::\d+)?\b/.test(text)) return text;

  const looksLikeHtmlApp =
    /<script[\s>]/i.test(text) ||
    /<!DOCTYPE\s+html/i.test(text) ||
    /<html[\s>]/i.test(text) ||
    (/<style[\s>]/i.test(text) &&
      /<\/style>/i.test(text) &&
      /<(?:div|section|main|body)\b/i.test(text));
  if (!looksLikeHtmlApp) return text;

  const startMatch = text.match(
    /<(?:!DOCTYPE\s+html|html\b|head\b|body\b|style\b|script\b|div\b|section\b|main\b)[\s>]/i
  );
  if (!startMatch || startMatch.index == null) return text;

  const before = text.slice(0, startMatch.index).trimEnd();
  // 펜스 조기 종료 방지: HTML 안의 ``` 를 깨진 형태가 아닌 문자로 치환
  const html = text
    .slice(startMatch.index)
    .trim()
    .replace(/```/g, "`\u200b``");
  const fenced = `\`\`\`html-app\n${html}\n\`\`\``;
  return before ? `${before}\n\n${fenced}` : fenced;
};

/**
 * AI 문서 초안 응답 파싱
 * 형식:
 * <<<TITLE>>>
 * 제목
 * <<<CONTENT>>>
 * 마크다운 본문
 * <<<END>>>
 */
export const parseDocumentDraftResponse = (text) => {
  // 주의: 본문의 ```html-app / 코드블록을 지우면 안 되므로 전역 ``` 제거 금지
  const raw = unwrapOuterMarkdownFence(text);
  if (!raw) return { title: "", content: "" };

  const titleMatch = raw.match(
    /<<<TITLE>>>\s*([\s\S]*?)\s*<<<CONTENT>>>/i
  );
  const contentMatch = raw.match(
    /<<<CONTENT>>>\s*([\s\S]*?)\s*(?:<<<END>>>|$)/i
  );
  if (titleMatch || contentMatch) {
    return {
      title: String(titleMatch?.[1] || "")
        .split(/\r?\n/)[0]
        .trim(),
      content: normalizeDocumentDraftContent(
        String(contentMatch?.[1] || "").trim()
      ),
    };
  }

  // fallback: 첫 줄이 # 제목이면 분리
  const lines = raw.split(/\r?\n/);
  if (lines[0] && /^#\s+/.test(lines[0])) {
    return {
      title: lines[0].replace(/^#\s+/, "").trim(),
      content: normalizeDocumentDraftContent(lines.slice(1).join("\n").trim()),
    };
  }
  return { title: "", content: normalizeDocumentDraftContent(raw) };
};

/**
 * document-draft Skill 실행 (보드 문서 마크다운 초안)
 */
export const executeDocumentDraftSkill = async ({
  academyId,
  user,
  academy,
  season,
  school,
  context = {},
  message = "",
  onEvent,
}) => {
  const profile = FEATURE_PROFILES.documentDraft;
  const emit = typeof onEvent === "function" ? onEvent : () => {};

  emit("step", { message: "문서 작성 준비 중..." });

  const writeMode = context.writeMode === "refine" ? "refine" : "create";
  const docTypeRaw = String(context.docType || "general").trim();
  const docType = DOCUMENT_DOC_TYPES[docTypeRaw] ? docTypeRaw : "general";
  const docTypeLabel = DOCUMENT_DOC_TYPES[docType];
  const boardName = String(context.boardName || context.label || "").trim();

  const currentTitle = String(context.currentTitle || "").trim();
  const currentContent = truncateText(
    String(context.currentContent || ""),
    PROMPT_LIMITS.DOCUMENT_DRAFT_CURRENT_CHARS || 10000
  );
  const sourceText = truncateText(
    String(context.sourceText || ""),
    PROMPT_LIMITS.DOCUMENT_DRAFT_SOURCE_CHARS || 12000
  );
  const userHint = truncateText(
    String(message || "").trim(),
    PROMPT_LIMITS.DOCUMENT_DRAFT_USER_HINT_CHARS || 2000
  );

  if (writeMode === "create" && !userHint && !sourceText) {
    const err = new Error(
      "초안에 쓸 정보를 입력하거나 텍스트 파일을 첨부해 주세요."
    );
    err.status = 400;
    err.code = AI_ERRORS.GENERATION_FAILED;
    throw err;
  }
  if (writeMode === "refine" && !currentContent.trim() && !userHint) {
    const err = new Error(
      "다듬을 본문이 없습니다. 에디터에 내용을 쓰거나 요청을 입력해 주세요."
    );
    err.status = 400;
    err.code = AI_ERRORS.GENERATION_FAILED;
    throw err;
  }

  const guidelines = await resolveDocumentGuidelines(
    academyId,
    school,
    season,
    context
  );

  const provider = resolveProvider(academy.aiProvider);
  const modelName = resolveModel(provider, academy.aiModel);

  const editorCatalog = `에디터가 지원하는 마크다운을 적극 활용하세요.
- 제목: # ## ###
- 목록: - 또는 1.
- 할 일: - [ ] / - [x]
- 표: GFM 테이블
- 인용: >
- 코드: \`\`\`언어 ... \`\`\`
- 강조: **굵게** *기울임* ~~취소선~~ \`인라인코드\`
- 링크: [텍스트](https://...)
- 수식: $인라인$ 또는 $$블록$$
- 구분선: ---
- 인터랙티브 HTML(퀴즈·계산기·학습 도구 등): 반드시 아래 형식으로만 넣으세요.
\`\`\`html-app
<!-- HTML/CSS/JS 전체. 닫는 펜스(\`\`\`)는 이 블록 안에 넣지 마세요 -->
\`\`\`
  · 높이 지정: \`\`\`html-app:500
  · script/style 포함 가능. 바깥에 생 HTML을 그대로 두지 마세요.
이미지·멘션·유튜브(\`![youtube](...)\` / \`![embed](...)\`)는 넣지 마세요. 필요하면 「(여기에 이미지)」처럼 자리만 남기세요.`;

  const taskRules =
    writeMode === "refine"
      ? `역할: 기존 문서를 목적에 맞게 다듬어 완성본 마크다운을 만듭니다.
- 기존 구조·핵심 정보를 유지하되 문장·구성을 개선하세요.
- 불필요한 중복을 줄이고, 문서 형태(${docTypeLabel})에 맞게 제목·목록·표·체크리스트를 활용하세요.
- 원문을 그대로 복사하지 말고 편집된 결과물만 출력하세요.`
      : `역할: 요청·자료를 바탕으로 새 문서 마크다운 초안을 만듭니다.
- 문서 형태(${docTypeLabel})에 맞는 구조로 작성하세요.
- 제목·소제목·목록·표·체크리스트 등을 목적에 맞게 활용하세요.
- 근거 없는 사실·개인정보·민감정보는 넣지 마세요.`;

  const prompt = `당신은 학교 보드 문서 작성 보조입니다. 교사가 에디터에서 바로 검토·수정할 마크다운 초안만 작성합니다.

${taskRules}

## 작성 지침
${guidelines || defaultSkillGuide(SKILL_IDS.DOCUMENT_DRAFT)}

## 문서 형태
${docTypeLabel}

## 보드
${boardName || "(미지정)"}

## 에디터 문법 가이드
${editorCatalog}

## 교사 요청
${userHint || "(없음)"}

## 첨부·참고 자료
${sourceText || "(없음)"}

## 현재 문서 (참고)
제목: ${currentTitle || "(없음)"}
본문:
${currentContent || "(없음)"}

## 출력 형식 (필수)
<<<TITLE>>>
문서 제목 (한 줄)
<<<CONTENT>>>
마크다운 본문 전체
<<<END>>>
- 설명·머리말·JSON 없이 위 형식만 출력하세요.
- CONTENT 안에는 <<<TITLE>>> / <<<CONTENT>>> / <<<END>>> 마커를 넣지 마세요.`;

  emit("step", {
    message:
      writeMode === "refine"
        ? "AI가 문서를 다듬고 있습니다..."
        : "AI가 문서 초안을 작성하고 있습니다...",
  });

  let tokenUsage = null;
  try {
    const generated = await runEvaluationGeneration({
      provider,
      apiKey: academy.aiApiKey,
      modelName,
      profile,
      systemInstruction: `You are Alter, a school document drafting assistant. Output only <<<TITLE>>> / <<<CONTENT>>> / <<<END>>> blocks with markdown the school's Tiptap editor can render. Interactive HTML/CSS/JS must be inside a \`\`\`html-app fenced block, never as raw HTML outside fences.`,
      messages: [{ role: "user", content: prompt }],
      onEvent: emit,
      progressLabel:
        writeMode === "refine" ? "문서 다듬는 중" : "문서 초안 작성 중",
    });
    tokenUsage = mergeTokenUsage(tokenUsage, generated.tokenUsage);

    const parsed = parseDocumentDraftResponse(generated.text || "");
    let title = truncateText(
      maskSensitiveText(parsed.title || "").text,
      PROMPT_LIMITS.DOCUMENT_DRAFT_TITLE_CHARS || 120
    ).trim();
    let content = truncateText(
      maskSensitiveText(parsed.content || "").text,
      PROMPT_LIMITS.DOCUMENT_DRAFT_CONTENT_CHARS || 14000
    ).trim();
    // 파서·마스킹 후에도 생 HTML이면 html-app으로 재정규화
    content = normalizeDocumentDraftContent(content);

    if (!content) {
      const err = new Error("생성 가능한 문서 초안이 없습니다. 다시 시도해 주세요.");
      err.status = 502;
      err.code = AI_ERRORS.EMPTY_RESPONSE;
      throw err;
    }
    if (!title) {
      title =
        currentTitle ||
        content
          .split(/\r?\n/)
          .find((l) => l.trim())
          ?.replace(/^#+\s*/, "")
          .slice(0, 80) ||
        "제목 없음";
    }

    const summary =
      writeMode === "refine"
        ? `「${title}」 문서를 다듬었습니다.`
        : `「${title}」 ${docTypeLabel} 초안을 만들었습니다.`;

    logAIUsage(academyId, {
      user,
      provider,
      model: modelName,
      feature: profile.feature,
      success: true,
      tokenUsage,
    });

    return {
      skill: SKILL_IDS.DOCUMENT_DRAFT,
      provider,
      modelName,
      tokenUsage,
      text: summary,
      draft: {
        kind: "document",
        writeMode,
        docType,
        title,
        content,
      },
    };
  } catch (err) {
    if (!err.code) err.code = mapProviderError(err);
    logAIUsage(academyId, {
      user,
      provider,
      model: modelName,
      feature: profile.feature,
      success: false,
      errorCode: err.code,
      tokenUsage,
    });
    throw err;
  }
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
  const { academy, season, school, registration } = await assertSeasonAiAccess(
    academyId,
    user,
    seasonId
  );

  if (skill === SKILL_IDS.SYLLABUS_DRAFT) {
    const result = await executeSyllabusDraftSkill({
      academyId,
      user,
      academy,
      season,
      school,
      context,
      message,
      onEvent,
    });
    return {
      skill,
      text: result.text,
      review: null,
      draft: result.draft,
      tokenUsage: result.tokenUsage,
    };
  }

  if (skill === SKILL_IDS.EVALUATION_DRAFT) {
    const result = await executeEvaluationDraftSkill({
      academyId,
      user,
      academy,
      season,
      school,
      registration,
      context,
      message,
      onEvent,
    });
    return {
      skill,
      text: result.text,
      review: null,
      draft: result.draft,
      tokenUsage: result.tokenUsage,
    };
  }

  if (skill === SKILL_IDS.ARCHIVE_DRAFT) {
    const result = await executeArchiveDraftSkill({
      academyId,
      user,
      academy,
      season,
      school,
      registration,
      context,
      message,
      onEvent,
    });
    return {
      skill,
      text: result.text,
      review: null,
      draft: result.draft,
      tokenUsage: result.tokenUsage,
    };
  }

  if (skill === SKILL_IDS.DOCUMENT_DRAFT) {
    const result = await executeDocumentDraftSkill({
      academyId,
      user,
      academy,
      season,
      school,
      context,
      message,
      onEvent,
    });
    return {
      skill,
      text: result.text,
      review: null,
      draft: result.draft,
      tokenUsage: result.tokenUsage,
    };
  }

  // default: chat
  const profile = FEATURE_PROFILES.chat;
  const provider = resolveProvider(academy.aiProvider);
  const modelName = resolveModel(provider, academy.aiModel);
  const chatPromptPack = await resolveSkillPromptPack(
    academyId,
    school,
    season,
    SKILL_IDS.CHAT,
    context?.referenceIndexes
  );
  const systemInstruction = buildAlterChatSystem(
    chatPromptPack,
    context,
    boardTitle
  );

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
    return { skill, text: safeText, review: null, draft: null, tokenUsage };
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
    /평가.*(초안|작성)/.test(text) ||
    /(초안|작성).*평가/.test(text) ||
    /\/(평가|evaluation[-_]?draft)/i.test(text)
  ) {
    return SKILL_IDS.EVALUATION_DRAFT;
  }
  if (
    /기록.*(초안|작성)/.test(text) ||
    /(초안|작성).*기록/.test(text) ||
    /행동특성|종합의견/.test(text) ||
    /\/(기록|archive[-_]?draft)/i.test(text)
  ) {
    return SKILL_IDS.ARCHIVE_DRAFT;
  }
  if (
    /문서.*(초안|작성|다듬)/.test(text) ||
    /(초안|작성|다듬).*문서/.test(text) ||
    /매뉴얼|회의록|공지문/.test(text) ||
    /\/(문서|document[-_]?draft)/i.test(text)
  ) {
    return SKILL_IDS.DOCUMENT_DRAFT;
  }
  if (
    /계획서.*(초안|작성)/.test(text) ||
    /(초안|작성).*계획서/.test(text) ||
    /\/(계획서|syllabus[-_]?draft)/i.test(text) ||
    /^(점검|리뷰|피드백)/.test(text) ||
    /계획서.*(점검|리뷰|피드백)/.test(text) ||
    /\/(점검|review)/i.test(text)
  ) {
    return SKILL_IDS.SYLLABUS_DRAFT;
  }
  return SKILL_IDS.CHAT;
};
