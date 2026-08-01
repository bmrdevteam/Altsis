/**
 * AI 프롬프트·작업 프로필 정책
 * @description 토큰 한도, 작업별 생성 파라미터, JSON 파싱 유틸
 */

export const AI_ERRORS = {
  NOT_ENABLED: "AI_NOT_ENABLED",
  NOT_ENABLED_FOR_SEASON: "AI_NOT_ENABLED_FOR_SEASON",
  API_KEY_NOT_SET: "AI_API_KEY_NOT_SET",
  NOT_AVAILABLE: "AI_NOT_AVAILABLE",
  EMPTY_RESPONSE: "AI_EMPTY_RESPONSE",
  INVALID_JSON: "AI_INVALID_JSON",
  MODEL_NOT_FOUND: "AI_MODEL_NOT_FOUND",
  INVALID_API_KEY: "AI_INVALID_API_KEY",
  GENERATION_FAILED: "AI_GENERATION_FAILED",
  CONTENT_BLOCKED: "AI_CONTENT_BLOCKED",
};

export const PROMPT_LIMITS = {
  HISTORY: 3,
  REFERENCE_COUNT: 2,
  REFERENCE_CHARS: 800,
  GUIDELINES_CHARS: 600,
  REFERENCE_TITLE_CHARS: 100,
};

/** 작업별 생성 파라미터 */
export const FEATURE_PROFILES = {
  syllabus: {
    feature: "syllabus",
    temperature: 0.4,
    maxTokens: 8192,
  },
  chat: {
    feature: "chat",
    temperature: 0.7,
    maxTokens: 2048,
  },
};

export const truncateText = (text, maxChars) => {
  const value = String(text || "");
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}…`;
};

/**
 * 학기 참고자료를 프롬프트/저장용으로 정규화
 */
export const normalizeReferences = (references = []) =>
  (references || []).slice(0, PROMPT_LIMITS.REFERENCE_COUNT).map((ref) => ({
    ...ref,
    title: truncateText(ref.title || "참고자료", PROMPT_LIMITS.REFERENCE_TITLE_CHARS),
    content: truncateText(ref.content || "", PROMPT_LIMITS.REFERENCE_CHARS),
  }));

/**
 * guidelines 저장/프롬프트용 정규화
 */
export const normalizeGuidelines = (guidelines) =>
  truncateText(guidelines || "", PROMPT_LIMITS.GUIDELINES_CHARS);

const normalizeFieldKey = (key) =>
  String(key || "")
    .replace(/[\s_\-./·]/g, "")
    .toLowerCase();

/**
 * 마크다운 fence / 주변 텍스트에서 JSON 후보 추출
 */
export const extractJsonCandidate = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return "";

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = raw.indexOf("{");
  if (start < 0) return raw;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }

  // 잘린 JSON도 후보로 사용 (이후 복구)
  return raw.slice(start);
};

/**
 * 문자열 값 안의 raw 제어문자·잘못된 이스케이프를 정리
 */
export const sanitizeJsonStringLiterals = (jsonStr) => {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonStr.length; i += 1) {
    const ch = jsonStr[i];
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }

    if (escaped) {
      // 유효하지 않은 escape면 백슬래시를 문자로 유지
      if (!/'|"|\\|\/|b|f|n|r|t|u/.test(ch)) {
        out += "\\" + ch;
      } else {
        out += ch;
      }
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      out += ch;
      continue;
    }

    if (ch === '"') {
      // 닫는 따옴표 뒤에는 , } ] : 가 와야 함. 아니면 값 내부 따옴표로 이스케이프
      const after = jsonStr.slice(i + 1).match(/^\s*([,}\]]|:)/);
      if (after) {
        inString = false;
        out += ch;
      } else {
        out += '\\"';
      }
      continue;
    }

    if (ch === "\n") {
      out += "\\n";
      continue;
    }
    if (ch === "\r") {
      out += "\\r";
      continue;
    }
    if (ch === "\t") {
      out += "\\t";
      continue;
    }

    out += ch;
  }

  return out;
};

/**
 * 잘린 JSON을 닫아 파싱 가능하게 시도
 */
export const closeTruncatedJson = (jsonStr) => {
  let inString = false;
  let escaped = false;
  let braces = 0;
  let brackets = 0;

  for (let i = 0; i < jsonStr.length; i += 1) {
    const ch = jsonStr[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") braces += 1;
    else if (ch === "}") braces -= 1;
    else if (ch === "[") brackets += 1;
    else if (ch === "]") brackets -= 1;
  }

  let result = jsonStr;
  if (inString) result += '"';
  // trailing comma 제거 후 닫기
  result = result.replace(/,\s*$/, "");
  while (brackets > 0) {
    result += "]";
    brackets -= 1;
  }
  while (braces > 0) {
    result += "}";
    braces -= 1;
  }
  return result;
};

const removeTrailingCommas = (jsonStr) =>
  jsonStr.replace(/,\s*([}\]])/g, "$1");

/**
 * LLM JSON을 여러 단계로 복구하며 파싱
 */
export const repairAndParseJson = (text) => {
  const candidate = extractJsonCandidate(text);
  if (!candidate) return null;

  const attempts = [
    candidate,
    removeTrailingCommas(candidate),
    sanitizeJsonStringLiterals(candidate),
    removeTrailingCommas(sanitizeJsonStringLiterals(candidate)),
    closeTruncatedJson(removeTrailingCommas(sanitizeJsonStringLiterals(candidate))),
  ];

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_) {
      // next attempt
    }
  }
  return null;
};

const objectToContent = (parsed) => {
  const content = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string") {
      content[key] = value;
    } else if (value == null) {
      content[key] = "";
    } else {
      content[key] = JSON.stringify(value);
    }
  }
  return content;
};

/**
 * AI 키를 폼 필드명에 최대한 맞춘다
 */
export const alignContentToFields = (content, expectedFields = []) => {
  if (!expectedFields.length) return content;

  const entries = Object.entries(content);
  const usedSource = new Set();
  const aligned = {};

  for (const field of expectedFields) {
    if (String(content[field] || "").trim()) {
      aligned[field] = content[field];
      usedSource.add(field);
      continue;
    }

    const target = normalizeFieldKey(field);
    const fuzzy = entries.find(
      ([key]) => !usedSource.has(key) && normalizeFieldKey(key) === target
    );
    if (fuzzy) {
      aligned[field] = fuzzy[1];
      usedSource.add(fuzzy[0]);
    }
  }

  // 매칭된 필드가 없으면 순서 매핑 시도
  if (Object.keys(aligned).length === 0 && entries.length > 0) {
    expectedFields.forEach((field, idx) => {
      if (entries[idx]) aligned[field] = entries[idx][1];
    });
    return aligned;
  }

  // 남은 키도 보존(폼에 없는 항목은 무시되어도 무방)
  for (const [key, value] of entries) {
    if (!(key in aligned)) aligned[key] = value;
  }
  return aligned;
};

/**
 * AI JSON 응답 파싱. 실패 시 예외(AI_INVALID_JSON)
 * @param {string} text
 * @param {string[]} [expectedFields]
 * @returns {Record<string, string>}
 */
export const parseSyllabusJson = (text, expectedFields = []) => {
  if (!text || !String(text).trim()) {
    const err = new Error(AI_ERRORS.EMPTY_RESPONSE);
    err.code = AI_ERRORS.EMPTY_RESPONSE;
    throw err;
  }

  const parsed = repairAndParseJson(text);
  if (!parsed) {
    const err = new Error(AI_ERRORS.INVALID_JSON);
    err.code = AI_ERRORS.INVALID_JSON;
    throw err;
  }

  let content = objectToContent(parsed);
  content = alignContentToFields(content, expectedFields);

  const hasAnyValue = Object.values(content).some((v) => String(v || "").trim());
  if (!hasAnyValue) {
    const err = new Error(AI_ERRORS.INVALID_JSON);
    err.code = AI_ERRORS.INVALID_JSON;
    throw err;
  }

  return content;
};

export const buildJsonRetryPrompt = (fieldNames = []) => {
  const fields =
    fieldNames.length > 0
      ? fieldNames
      : ["수업교재", "개설배경", "학습목표", "학습계획"];
  return `이전 응답이 유효한 JSON이 아닙니다. 설명·마크다운 없이 JSON 객체 하나만 출력하세요.
규칙:
- 키는 아래 이름을 정확히 사용
- 각 값은 한 줄 문자열(실제 줄바꿈 금지, 필요하면 \\n 사용)
- 값 안의 따옴표는 \\" 로 이스케이프
- 항목이 많으면 각 값을 한 문장으로 짧게
{
${fields.map((name) => `  ${JSON.stringify(name)}: "내용"`).join(",\n")}
}`;
};
