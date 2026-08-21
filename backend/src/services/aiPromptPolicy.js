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
  USAGE_LIMIT_EXCEEDED: "AI_USAGE_LIMIT_EXCEEDED",
};

export const PROMPT_LIMITS = {
  HISTORY: 3,
  REFERENCE_COUNT: 2,
  REFERENCE_CHARS: 800,
  /** Alter chat: 참고 자료 개수 */
  CHAT_REFERENCE_COUNT: 8,
  /** Alter chat: 참고 본문/항목 */
  CHAT_REFERENCE_CHARS: 4000,
  /** Alter chat: 지침(instruction) 합산 */
  CHAT_GUIDELINES_TOTAL_CHARS: 8000,
  /** 라이브러리 항목 저장 상한 (프롬프트 주입 한도와 분리) */
  LIBRARY_CONTENT_CHARS: 200000,
  /** Alter chat: 페이지 로드 데이터 스냅샷 전체 상한 (생기부 인쇄본 등) */
  CHAT_SNAPSHOT_CHARS: 48000,
  /** Alter chat: 스냅샷 항목 수 상한 */
  CHAT_SNAPSHOT_MAX_ITEMS: 50,
  /** Alter chat: 항목 필드값 상한 (문서 본문과 동일 수준) */
  CHAT_SNAPSHOT_FIELD_CHARS: 40000,
  /** Alter chat 「데이터 확대」: 스냅샷 전체 상한 */
  CHAT_SNAPSHOT_CHARS_EXPANDED: 120000,
  /** Alter chat 「데이터 확대」: 항목 수 상한 */
  CHAT_SNAPSHOT_MAX_ITEMS_EXPANDED: 150,
  /** Alter chat retrieval: 청크 개수 */
  CHAT_RETRIEVE_CHUNK_LIMIT: 6,
  /** Alter chat retrieval: 문서당 최대 청크 */
  CHAT_RETRIEVE_PER_DOC: 3,
  GUIDELINES_CHARS: 600,
  /** 라이브러리 지침(+레거시) 합산 상한 */
  GUIDELINES_TOTAL_CHARS: 2400,
  REFERENCE_TITLE_CHARS: 100,
  EXAMPLE_FIELDS: 8,
  EXAMPLE_CHARS: 400,
  EXAMPLES_TOTAL_CHARS: 3000,
  USER_GOAL_CHARS: 400,
  USER_CRITERIA_CHARS: 400,
  /** 점검 시 한 번에 요청할 항목 수 (잘림 방지용 청크) */
  REVIEW_CHUNK_FIELDS: 10,
  REVIEW_COMMENT_CHARS: 160,
  REVIEW_SUGGESTION_CHARS: 320,
  REVIEW_QUOTE_CHARS: 220,
  REVIEW_EXAMPLE_CHARS: 240,
  /** 문서 점검 리포트 최대 항목 수 */
  REVIEW_MAX_ITEMS: 24,
  /** 강의계획서 초안: 한 번에 작성할 항목 수 */
  SYLLABUS_DRAFT_CHUNK_FIELDS: 8,
  /** 강의계획서 초안: 필드당 최대 글자 */
  SYLLABUS_DRAFT_FIELD_CHARS: 800,
  /** 강의계획서 초안: 사용자 제공 자료 최대 글자 */
  SYLLABUS_DRAFT_SOURCE_CHARS: 12000,
  /** 평가 초안: 한 요청 최대 학생 수 */
  EVAL_DRAFT_MAX_STUDENTS: 30,
  /** 평가 초안: 한 묶음 최대 학생 수 (줄 단위 출력이라 크게 잡아도 안전) */
  EVAL_DRAFT_CHUNK_SIZE: 10,
  /** 평가 초안: 한 묶음 최대 칸 수 (학생 수 × 작성 항목 수) */
  EVAL_DRAFT_CHUNK_CELLS: 12,
  /** 평가 초안: 동시에 실행할 묶음 수 */
  EVAL_DRAFT_CONCURRENCY: 3,
  /** 평가 초안: 셀당 최대 글자 */
  EVAL_DRAFT_CELL_CHARS: 600,
  /** 평가 초안: 참고 셀 최대 글자 */
  EVAL_DRAFT_CONTEXT_CHARS: 400,
  /** 평가 초안: 교사 요청 문구 최대 글자 */
  EVAL_DRAFT_USER_HINT_CHARS: 1800,
  /** 기록 초안: 한 요청 최대 학생 수 */
  ARCHIVE_DRAFT_MAX_STUDENTS: 30,
  /** 기록 초안: 한 묶음 최대 학생 수 */
  ARCHIVE_DRAFT_CHUNK_SIZE: 10,
  /** 기록 초안: 한 묶음 최대 칸 수 */
  ARCHIVE_DRAFT_CHUNK_CELLS: 12,
  /** 기록 초안: 동시 묶음 수 */
  ARCHIVE_DRAFT_CONCURRENCY: 3,
  /** 기록 초안: 셀당 최대 글자 */
  ARCHIVE_DRAFT_CELL_CHARS: 800,
  /** 기록 초안: 기존 값 참고 최대 글자 */
  ARCHIVE_DRAFT_CONTEXT_CHARS: 400,
  /** 기록 초안: 교사 요청 문구 최대 글자 */
  ARCHIVE_DRAFT_USER_HINT_CHARS: 1800,
  /** 문서 초안: 본문 최대 글자 */
  DOCUMENT_DRAFT_CONTENT_CHARS: 14000,
  /** 문서 초안: 참고용 현재 본문 최대 글자 */
  DOCUMENT_DRAFT_CURRENT_CHARS: 10000,
  /** 문서 초안: 첨부/자료 최대 글자 */
  DOCUMENT_DRAFT_SOURCE_CHARS: 12000,
  /** 문서 초안: 교사 요청 문구 최대 글자 */
  DOCUMENT_DRAFT_USER_HINT_CHARS: 2000,
  /** 문서 초안: 제목 최대 글자 */
  DOCUMENT_DRAFT_TITLE_CHARS: 120,
  /** 문서 점검: 본문 상한 (문서함 직렬화·chat 스냅샷과 맞춤) */
  DOCUMENT_REVIEW_CONTENT_CHARS: 40000,
  DOCUMENT_REVIEW_USER_HINT_CHARS: 2000,
  DOCUMENT_REVIEW_FIELD_COUNT: 40,
  /** 양식 응답 초안: 필드 값 합계 최대 글자 */
  FORM_RESPONSE_DRAFT_CONTENT_CHARS: 14000,
  /** 양식 응답 초안: 현재 응답 JSON 참고 최대 글자 */
  FORM_RESPONSE_DRAFT_CURRENT_CHARS: 12000,
  /** 양식 응답 초안: docResponse 템플릿/baseDocument 최대 글자 */
  FORM_RESPONSE_DRAFT_TEMPLATE_CHARS: 12000,
  /** 양식 응답 초안: 첨부/자료 최대 글자 */
  FORM_RESPONSE_DRAFT_SOURCE_CHARS: 12000,
  /** 양식 응답 초안: 요청 문구 최대 글자 */
  FORM_RESPONSE_DRAFT_USER_HINT_CHARS: 2000,
  /** 활동 초안: 필드 최대 개수 */
  ACTIVITY_DRAFT_MAX_FIELDS: 40,
  /** 활동 초안: 필드 content 최대 글자 */
  ACTIVITY_DRAFT_FIELD_CONTENT_CHARS: 12000,
  /** 활동 초안: 현재 양식 JSON 참고 최대 글자 */
  ACTIVITY_DRAFT_CURRENT_CHARS: 14000,
  /** 활동 초안: 첨부/자료 최대 글자 */
  ACTIVITY_DRAFT_SOURCE_CHARS: 12000,
  /** 활동 초안: 교사 요청 문구 최대 글자 */
  ACTIVITY_DRAFT_USER_HINT_CHARS: 2000,
  /** 활동 초안: 제목 최대 글자 */
  ACTIVITY_DRAFT_TITLE_CHARS: 120,
  /** 활동 초안: 설명 최대 글자 */
  ACTIVITY_DRAFT_DESCRIPTION_CHARS: 2000,
  /** 관리자 양식 초안: 현재 문서 compact JSON 최대 글자 */
  FORM_DRAFT_CURRENT_CHARS: 18000,
  /** 관리자 양식 초안: 첨부/자료 최대 글자 */
  FORM_DRAFT_SOURCE_CHARS: 12000,
  /** 관리자 양식 초안: 교사 요청 문구 최대 글자 */
  FORM_DRAFT_USER_HINT_CHARS: 2000,
  /** 채점 초안: 응답/루브릭 컨텍스트 최대 글자 */
  ASSESSMENT_GRADE_CONTEXT_CHARS: 14000,
  /** 채점 초안: 교사 요청 문구 최대 글자 */
  ASSESSMENT_GRADE_USER_HINT_CHARS: 2000,
  /** 채점 초안: 필드 코멘트 최대 글자 */
  ASSESSMENT_GRADE_COMMENT_CHARS: 800,
};

const KEY_FIELD_RE =
  /배경|목표|교재|평가|계획|1주차|총괄|개설|성취|수준|내용/;

/** 작업별 생성 파라미터 */
export const FEATURE_PROFILES = {
  syllabusReview: {
    feature: "syllabus_review",
    temperature: 0.3,
    maxTokens: 8192,
  },
  syllabusDraft: {
    feature: "syllabus_draft",
    temperature: 0.4,
    maxTokens: 8192,
  },
  guidelinesTemplate: {
    feature: "guidelines_template",
    temperature: 0.25,
    maxTokens: 1024,
  },
  chat: {
    feature: "chat",
    temperature: 0.7,
    maxTokens: 2048,
  },
  formAiChat: {
    feature: "form-ai-chat",
    temperature: 0.7,
    maxTokens: 2048,
  },
  evaluationDraft: {
    feature: "evaluation_draft",
    temperature: 0.3,
    maxTokens: 4096,
  },
  archiveDraft: {
    feature: "archive_draft",
    temperature: 0.35,
    maxTokens: 4096,
  },
  documentDraft: {
    feature: "document_draft",
    temperature: 0.45,
    maxTokens: 8192,
  },
  formResponseDraft: {
    feature: "form_response_draft",
    temperature: 0.4,
    maxTokens: 8192,
  },
  activityDraft: {
    feature: "activity_draft",
    temperature: 0.4,
    maxTokens: 8192,
  },
  formDraft: {
    feature: "form_draft",
    temperature: 0.35,
    maxTokens: 12288,
  },
  assessmentGrade: {
    feature: "assessment_grade",
    temperature: 0.3,
    maxTokens: 4096,
  },
  documentReview: {
    feature: "document_review",
    temperature: 0.3,
    maxTokens: 8192,
  },
};

export const REVIEW_LEVELS = ["good", "fair", "needs_work", "empty"];

export const truncateText = (text, maxChars) => {
  const value = String(text || "");
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}…`;
};

/**
 * @param {"chat"|"default"} [profile]
 */
export const getReferenceLimits = (profile = "default") => {
  if (profile === "chat") {
    return {
      count: PROMPT_LIMITS.CHAT_REFERENCE_COUNT || 8,
      chars: PROMPT_LIMITS.CHAT_REFERENCE_CHARS || 4000,
      guidelinesTotal:
        PROMPT_LIMITS.CHAT_GUIDELINES_TOTAL_CHARS ||
        PROMPT_LIMITS.GUIDELINES_TOTAL_CHARS ||
        8000,
      instructionBlockChars: PROMPT_LIMITS.CHAT_REFERENCE_CHARS || 4000,
    };
  }
  return {
    count: PROMPT_LIMITS.REFERENCE_COUNT || 2,
    chars: PROMPT_LIMITS.REFERENCE_CHARS || 800,
    guidelinesTotal:
      PROMPT_LIMITS.GUIDELINES_TOTAL_CHARS ||
      PROMPT_LIMITS.GUIDELINES_CHARS * 4 ||
      2400,
    instructionBlockChars: PROMPT_LIMITS.REFERENCE_CHARS || 800,
  };
};

/**
 * 학기 참고자료를 프롬프트/저장용으로 정규화 (개수 제한 포함)
 * @param {Object[]} [references]
 * @param {{ count?: number, chars?: number }} [limits]
 */
export const normalizeReferences = (references = [], limits = {}) => {
  const count = limits.count ?? PROMPT_LIMITS.REFERENCE_COUNT;
  const chars = limits.chars ?? PROMPT_LIMITS.REFERENCE_CHARS;
  return (references || []).slice(0, count).map((ref) => ({
    ...ref,
    title: truncateText(
      ref.title || "참고자료",
      PROMPT_LIMITS.REFERENCE_TITLE_CHARS
    ),
    content: truncateText(ref.content || "", chars),
  }));
};

/**
 * 선택한 인덱스의 참고자료를 프롬프트용으로 정규화
 * @param {Object[]} references
 * @param {number[]|undefined} indexes
 * @param {{ count?: number, chars?: number }} [limits]
 */
export const selectReferencesForPrompt = (
  references = [],
  indexes,
  limits
) => {
  let selected = references || [];
  if (Array.isArray(indexes) && indexes.length > 0) {
    selected = indexes
      .map((i) => references[i])
      .filter((ref) => ref && (ref.content || ref.title));
  }
  return normalizeReferences(selected, limits);
};

/**
 * guidelines 저장/프롬프트용 정규화
 */
export const normalizeGuidelines = (guidelines) =>
  truncateText(guidelines || "", PROMPT_LIMITS.GUIDELINES_CHARS);

/** AI 실패 시 사용할 기본 지침 템플릿 */
export const FALLBACK_GUIDELINES_TEMPLATE = `- 학교 교육철학에 맞게 학생 주도·협력·성찰을 강조한다.
- 학습목표는 관찰 가능한 행동 동사로 3~5개 작성한다.
- 주차별 계획은 활동 중심이며 평가와 연결한다.
- 문체는 교사에게 바로 붙여넣을 수 있는 공손한 문어체로 한다.
- 추측성 법령·외부 기관 정보는 넣지 않는다.
- 각 항목은 2~4문장으로 간결하게 쓴다.`;

/**
 * AI 응답에서 지침 bullet 줄만 추출
 * @returns {string[]}
 */
export const extractGuidelinesBullets = (text) => {
  const raw = String(text || "")
    .replace(/^```(?:markdown|text|json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (!raw) return [];

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .replace(/^[-*•●▪]\s*/, "- ")
        .replace(/^\d+[.)]\s*/, "- ")
    )
    .filter((line) => line.startsWith("- ") && line.length > 3);

  if (lines.length > 0) return lines.slice(0, 8);

  // 한 줄에 "; " 또는 " / "로만 나열한 경우
  const parts = raw
    .split(/\s*[;|/]\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 8 && /[\uAC00-\uD7A3]/.test(p));
  return parts.slice(0, 8).map((p) => `- ${p.replace(/^[-*•]\s*/, "")}`);
};

/**
 * 추천 지침이 한국어 bullet 형식인지 검사
 */
export const isValidGuidelinesTemplate = (text) => {
  const bullets = extractGuidelinesBullets(text);
  if (bullets.length < 3) return false;
  const joined = bullets.join("\n");
  const hangulCount = (joined.match(/[\uAC00-\uD7A3]/g) || []).length;
  if (hangulCount < 30) return false;
  // 영어 메타 요약 거부
  if (/\b(includes?|key elements?|byeolmuri|student-led)\b/i.test(joined)) {
    return false;
  }
  return true;
};

/**
 * AI 응답 → 저장 가능한 지침 텍스트 (실패 시 null)
 */
export const parseGuidelinesTemplate = (text) => {
  const bullets = extractGuidelinesBullets(text);
  if (!isValidGuidelinesTemplate(bullets.join("\n"))) return null;
  return normalizeGuidelines(bullets.join("\n"));
};

export const buildGuidelinesTemplatePrompt = ({
  schoolName = "",
  seasonLabel = "",
  fieldNames = [],
}) => `역할: 대안학교 강의계획서 AI 도우미용 「기본 지침」 작성자.

반드시 한국어로, 아래 예시와 같은 bullet 목록만 출력하세요. 다른 문장·영어·코드펜스는 금지입니다.

예시:
- 학교 교육철학에 맞게 학생 주도·협력·성찰을 강조한다.
- 학습목표는 관찰 가능한 행동 동사로 3~5개 작성한다.
- 주차별 계획은 활동 중심이며 평가와 연결한다.
- 문체는 공손한 문어체로 쓴다.
- 추측성 법령·외부 기관 정보는 넣지 않는다.
- 각 항목은 2~4문장으로 간결하게 쓴다.

맥락(지침 내용에 학교명·학기명을 나열하지 말고, 문체·강조점만 반영):
- 학교: ${schoolName || "(미상)"}
- 학기: ${seasonLabel || "(미상)"}
- 양식 항목: ${fieldNames.length ? fieldNames.join(", ") : "(없음)"}

규칙:
1) 3~8개 줄, 각 줄은 "- "로 시작
2) 각 줄은 한 문장, 전체 ${PROMPT_LIMITS.GUIDELINES_CHARS}자 이내
3) 학생 주도·협력·성찰, 관찰 가능한 목표, 활동-평가 연결, 공손한 문어체, 간결성 포함
4) 영어 단어나 "Includes key elements" 같은 요약 문구 금지
5) 출력은 bullet 목록만`;

export const buildGuidelinesTemplateRetryPrompt = () =>
  `이전 답이 형식에 맞지 않았습니다. 이번에는 한국어 bullet만 출력하세요.
각 줄은 "- "로 시작하고, 3~8줄만 쓰세요. 영어·설명·코드펜스 금지.

- 학교 교육철학에 맞게 학생 주도·협력·성찰을 강조한다.
- 학습목표는 관찰 가능한 행동 동사로 쓴다.
- 주차별 계획은 활동 중심이며 평가와 연결한다.
- 문체는 공손한 문어체로 한다.
- 추측성 법령·외부 기관 정보는 넣지 않는다.
- 각 항목은 2~4문장으로 간결하게 쓴다.`;

/**
 * formSyllabus에서 input 필드 메타 추출
 * 저장 키는 cell.id, 표시/AI 라벨은 cell.name (없으면 id)
 * @returns {{ id: string, name: string, required: boolean }[]}
 */
export const extractSyllabusInputFields = (formSyllabus) => {
  const fields = [];
  const seen = new Set();
  if (!formSyllabus?.data) return fields;

  for (const block of formSyllabus.data) {
    if (block.type !== "table" || !block.data?.table) continue;
    for (const row of block.data.table) {
      for (const cell of row) {
        if (cell.type !== "input") continue;
        const id = cell.id || cell.name;
        const name = cell.name || cell.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        fields.push({ id, name, required: !!cell.required });
      }
    }
  }
  return fields;
};

/**
 * info에서 필드 값 읽기 (id 우선, name 하위 호환)
 * @param {Object} info
 * @param {{ id?: string, name?: string } | string} field
 */
export const readSyllabusInfoValue = (info, field) => {
  if (!info || field == null) return undefined;
  if (typeof field === "string") {
    return info[field];
  }
  if (field.id != null && info[field.id] !== undefined) return info[field.id];
  if (field.name != null && info[field.name] !== undefined) {
    return info[field.name];
  }
  return undefined;
};

/**
 * 모범 답안 작성·표시용 핵심 필드 (최대 EXAMPLE_FIELDS)
 */
export const pickKeyExampleFields = (fieldNames = []) => {
  const names = (fieldNames || []).filter(Boolean);
  if (names.length === 0) return [];

  const requiredLike = names.filter((n) => KEY_FIELD_RE.test(n));
  const rest = names.filter((n) => !KEY_FIELD_RE.test(n));
  return [...requiredLike, ...rest].slice(0, PROMPT_LIMITS.EXAMPLE_FIELDS);
};

/**
 * 모범 답안 정규화 (Record 또는 {field,sample}[])
 * @returns {Record<string, string>}
 */
export const normalizeExamples = (examples, allowedFields = []) => {
  let source = {};
  if (examples instanceof Map) {
    source = Object.fromEntries(examples);
  } else if (Array.isArray(examples)) {
    for (const item of examples) {
      if (item?.field) source[item.field] = item.sample;
    }
  } else if (examples && typeof examples === "object") {
    source = { ...examples };
  }

  const keys =
    allowedFields.length > 0
      ? allowedFields.filter((f) => source[f] != null)
      : Object.keys(source);

  const result = {};
  let total = 0;
  for (const field of keys.slice(0, PROMPT_LIMITS.EXAMPLE_FIELDS)) {
    const sample = truncateText(
      String(source[field] || "").trim(),
      PROMPT_LIMITS.EXAMPLE_CHARS
    );
    if (!sample) continue;
    if (total + sample.length > PROMPT_LIMITS.EXAMPLES_TOTAL_CHARS) break;
    result[field] = sample;
    total += sample.length;
  }
  return result;
};

/**
 * 생성 시 사용자 추가 입력 정규화
 */
export const normalizeUserInputs = ({ goal, additionalCriteria } = {}) => ({
  goal: truncateText(String(goal || "").trim(), PROMPT_LIMITS.USER_GOAL_CHARS),
  additionalCriteria: truncateText(
    String(additionalCriteria || "").trim(),
    PROMPT_LIMITS.USER_CRITERIA_CHARS
  ),
});

/**
 * 기존 강의계획서 info에서 모범 답안 추출
 * @param {Object} info
 * @param {Array<{ id?: string, name?: string } | string>} fields
 * @returns {Record<string, string>}
 */
export const examplesFromSyllabusInfo = (info, fields = []) => {
  if (!info || typeof info !== "object") return {};

  const metas = (fields || []).map((f) =>
    typeof f === "string" ? { id: f, name: f } : f
  );
  const labels = metas.map((m) => m.name).filter(Boolean);
  const preferredLabels =
    labels.length > 0 ? pickKeyExampleFields(labels) : Object.keys(info);

  const raw = {};
  for (const label of preferredLabels) {
    const meta =
      metas.find((m) => m.name === label || m.id === label) || {
        id: label,
        name: label,
      };
    const value = readSyllabusInfoValue(info, meta);
    if (typeof value === "string" && value.trim()) {
      raw[label] = value.trim();
    } else if (value != null && typeof value !== "object") {
      const text = String(value).trim();
      if (text) raw[label] = text;
    }
  }

  // 핵심 필드가 비어 있으면 info에서 채워진 문자열 필드를 보충
  if (Object.keys(raw).length === 0) {
    for (const [field, value] of Object.entries(info)) {
      if (typeof value === "string" && value.trim()) {
        raw[field] = value.trim();
      }
      if (Object.keys(raw).length >= PROMPT_LIMITS.EXAMPLE_FIELDS) break;
    }
  }

  return normalizeExamples(raw, Object.keys(raw));
};

/**
 * 모범 본문에서 주제 없이 스타일·완성도 기준만 추출
 * @param {Record<string, string>} examples
 * @returns {string}
 */
export const buildStyleRubricFromExamples = (examples = {}) => {
  const samples = Object.values(examples || {})
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  if (samples.length === 0) {
    return `- 각 항목은 1~3문장, 관찰 가능한 활동·목표가 드러나도록 구체적으로 작성
- 공손한 문어체, 추측성 법령·외부 기관 단정은 피함
- 추상어만 나열하지 말고 수업에서 무엇을 하는지 보이게 작성`;
  }

  const lengths = samples.map((s) => s.length);
  const avgLen = Math.round(
    lengths.reduce((a, b) => a + b, 0) / lengths.length
  );
  const avgSentences =
    samples.reduce((n, s) => n + (s.split(/[.!?。！？\n]+/).filter(Boolean).length || 1), 0) /
    samples.length;
  const sentenceHint =
    avgSentences <= 1.5 ? "주로 1~2문장" : avgSentences <= 3 ? "주로 2~3문장" : "3문장 내외";
  const lengthHint =
    avgLen < 80 ? "짧게" : avgLen < 180 ? "중간 분량" : "다소 자세히";

  return `- 분량: ${lengthHint} (${sentenceHint}, 평균 약 ${avgLen}자 수준)
- 문체: 공손한 문어체, 교사 작성 문서 톤
- 구체성: 활동·목표·평가가 드러나는 서술 (추상 구호만 나열하지 않음)
- 금지: 모범에 나온 교과 주제·고유 명사·활동명을 이번 수업에 가져오지 말 것
- 이번 수업의 교과목·수업명·작성본·목표만 근거로 삼을 것`;
};

/**
 * 작성본 info를 프롬프트용으로 요약
 * @param {Object} info
 * @param {Array<{ id?: string, name?: string } | string>} fields
 */
export const formatCurrentInfoForPrompt = (info = {}, fields = []) => {
  const metas =
    fields.length > 0
      ? fields.map((f) =>
          typeof f === "string" ? { id: f, name: f } : f
        )
      : Object.keys(info || {}).map((k) => ({ id: k, name: k }));
  const lines = [];
  for (const meta of metas) {
    const label = meta.name || meta.id;
    const value = readSyllabusInfoValue(info, meta);
    if (typeof value === "string" && value.trim()) {
      lines.push(
        `- ${JSON.stringify(label)}: ${JSON.stringify(
          truncateText(value.trim(), PROMPT_LIMITS.EXAMPLE_CHARS)
        )}`
      );
    } else {
      lines.push(`- ${JSON.stringify(label)}: ""`);
    }
  }
  return lines.join("\n");
};

const normalizeReviewLevel = (level) => {
  const v = String(level || "").toLowerCase();
  if (REVIEW_LEVELS.includes(v)) return v;
  if (v.includes("good") || v.includes("충분")) return "good";
  if (v.includes("fair") || v.includes("보통")) return "fair";
  if (v.includes("empty") || v.includes("빈") || v.includes("미작"))
    return "empty";
  if (v.includes("need") || v.includes("보완") || v.includes("부족"))
    return "needs_work";
  return "needs_work";
};

const resolveReviewFieldName = (rawField, fieldNames = []) => {
  const raw = String(rawField || "").trim();
  if (!raw) return "";
  if (fieldNames.includes(raw)) return raw;
  const norm = normalizeFieldKey(raw);
  const exact = fieldNames.find((n) => normalizeFieldKey(n) === norm);
  if (exact) return exact;
  const partial = fieldNames.find((n) => {
    const nn = normalizeFieldKey(n);
    return nn.includes(norm) || norm.includes(nn);
  });
  return partial || raw;
};

const salvageReviewFromText = (text) => {
  const raw = String(text || "");
  const summaryMatch = raw.match(
    /"summary"\s*:\s*"((?:\\.|[^"\\])*)"/i
  );
  const overallMatch = raw.match(
    /"overallLevel"\s*:\s*"((?:\\.|[^"\\])*)"/i
  );
  const summary = summaryMatch
    ? summaryMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"')
    : "";
  const overallLevel = normalizeReviewLevel(overallMatch?.[1] || "fair");

  const items = [];
  const itemRe =
    /\{\s*"field"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"level"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"comment"\s*:\s*"((?:\\.|[^"\\])*)"\s*(?:,\s*"suggestion"\s*:\s*"((?:\\.|[^"\\])*)")?/gi;
  let m;
  while ((m = itemRe.exec(raw)) !== null) {
    items.push({
      field: m[1].replace(/\\"/g, '"'),
      level: normalizeReviewLevel(m[2]),
      comment: m[3].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
      suggestion: (m[4] || "").replace(/\\n/g, "\n").replace(/\\"/g, '"'),
      quote: "",
      exampleBefore: "",
      exampleAfter: "",
    });
  }

  if (!summary && items.length === 0) return null;
  return { summary, overallLevel, items };
};

const normalizeReviewItemExtras = (item = {}) => ({
  quote: truncateText(
    String(item.quote || item.evidence || item.원문 || "").trim(),
    PROMPT_LIMITS.REVIEW_QUOTE_CHARS
  ),
  exampleBefore: truncateText(
    String(
      item.exampleBefore || item.before || item.변경전 || item.from || ""
    ).trim(),
    PROMPT_LIMITS.REVIEW_EXAMPLE_CHARS
  ),
  exampleAfter: truncateText(
    String(
      item.exampleAfter || item.after || item.변경후 || item.to || ""
    ).trim(),
    PROMPT_LIMITS.REVIEW_EXAMPLE_CHARS
  ),
});

const emptyReviewItem = (field, level = "empty", comment = "") => ({
  field,
  level,
  comment,
  suggestion: "",
  quote: "",
  exampleBefore: "",
  exampleAfter: "",
});

/**
 * 점검 결과 JSON 파싱
 * @param {string} text
 * @param {string[]} [fieldNames]
 * @param {{ openFields?: boolean }} [options] openFields=true 이면 fieldNames로 강제 채우지 않고 AI 항목을 그대로 유지
 */
export const parseSyllabusReviewJson = (
  text,
  fieldNames = [],
  options = {}
) => {
  if (!text || !String(text).trim()) {
    const err = new Error(AI_ERRORS.EMPTY_RESPONSE);
    err.code = AI_ERRORS.EMPTY_RESPONSE;
    throw err;
  }

  let parsed = repairAndParseJson(text);
  if (!parsed) {
    parsed = salvageReviewFromText(text);
  }
  if (!parsed) {
    const err = new Error(AI_ERRORS.INVALID_JSON);
    err.code = AI_ERRORS.INVALID_JSON;
    throw err;
  }

  const summary = String(parsed.summary || parsed.총평 || "").trim();
  const overallLevel = normalizeReviewLevel(
    parsed.overallLevel || parsed.overall || "fair"
  );
  const openFields = options?.openFields === true;

  const rawItems = Array.isArray(parsed.items)
    ? parsed.items
    : Array.isArray(parsed.fields)
      ? parsed.fields
      : [];

  const byField = new Map();
  const openItems = [];
  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;
    const resolved = resolveReviewFieldName(
      item.field || item.name || item.key,
      openFields ? [] : fieldNames
    );
    if (!resolved) continue;
    const normalized = {
      field: resolved,
      level: normalizeReviewLevel(item.level || item.status),
      comment: truncateText(
        String(item.comment || item.note || "").trim(),
        PROMPT_LIMITS.REVIEW_COMMENT_CHARS
      ),
      suggestion: truncateText(
        String(item.suggestion || item.rewrite || "").trim(),
        PROMPT_LIMITS.REVIEW_SUGGESTION_CHARS
      ),
      ...normalizeReviewItemExtras(item),
    };
    if (openFields) {
      openItems.push(normalized);
    } else {
      byField.set(resolved, normalized);
    }
  }

  const items = [];
  if (openFields) {
    items.push(
      ...openItems.slice(0, PROMPT_LIMITS.REVIEW_MAX_ITEMS || 24)
    );
  } else if (fieldNames.length > 0) {
    for (const field of fieldNames) {
      if (byField.has(field)) {
        items.push(byField.get(field));
      } else {
        items.push(
          emptyReviewItem(field, "empty", "점검 응답에 포함되지 않았습니다.")
        );
      }
    }
  } else if (byField.size > 0) {
    // fieldNames가 없으면 AI가 준 항목 그대로
    items.push(...byField.values());
  }

  if (!summary && items.length === 0) {
    const err = new Error(AI_ERRORS.INVALID_JSON);
    err.code = AI_ERRORS.INVALID_JSON;
    throw err;
  }

  return {
    summary: summary || "작성된 내용을 바탕으로 점검했습니다.",
    overallLevel,
    items,
  };
};

export const buildReviewRetryPrompt = (fieldNames = [], options = {}) => {
  const openFields = options?.openFields === true;
  const focus =
    !openFields && Array.isArray(fieldNames) && fieldNames.length > 0
      ? `\nitems.field는 다음을 빠짐없이 사용: ${fieldNames
          .map((n) => JSON.stringify(n))
          .join(", ")}`
      : openFields
        ? `\nitems.field는 "섹션 · 구체 대상" 형식으로 구체적으로 쓰세요.${
            Array.isArray(fieldNames) && fieldNames.length > 0
              ? ` 가능하면 다음 섹션명을 접두로 사용: ${fieldNames
                  .slice(0, 20)
                  .map((n) => JSON.stringify(n))
                  .join(", ")}`
              : ""
          }`
        : "";
  return `이전 응답이 유효한 JSON이 아닙니다. 설명·마크다운·코드펜스 없이 JSON 객체 하나만 출력하세요.
각 comment는 1문장.
needs_work|fair 항목에는 quote(원문 인용)·exampleBefore·exampleAfter를 できるだけ 채우세요. 없으면 "".
{
  "summary": "총평 2~3문장",
  "overallLevel": "good|fair|needs_work",
  "items": [
    {
      "field": "섹션 · 구체 대상",
      "level": "good|fair|needs_work|empty",
      "comment": "짧은 코멘트",
      "quote": "문제된 원문 한 줄",
      "suggestion": "수정 방향 한 줄",
      "exampleBefore": "변경 전 예시",
      "exampleAfter": "변경 후 예시"
    }
  ]
}${focus}`;
};

/**
 * 강의계획서 초안 JSON 파싱
 * @returns {{ summary: string, items: Array<{ field: string, value: string }> }}
 */
export const parseSyllabusDraftJson = (text, fieldNames = []) => {
  if (!text || !String(text).trim()) {
    const err = new Error(AI_ERRORS.EMPTY_RESPONSE);
    err.code = AI_ERRORS.EMPTY_RESPONSE;
    throw err;
  }

  let parsed = repairAndParseJson(text);
  if (!parsed || typeof parsed !== "object") {
    const err = new Error(AI_ERRORS.INVALID_JSON);
    err.code = AI_ERRORS.INVALID_JSON;
    throw err;
  }

  const summary = String(parsed.summary || parsed.총평 || "").trim();
  const rawItems = Array.isArray(parsed.items)
    ? parsed.items
    : Array.isArray(parsed.fields)
      ? parsed.fields
      : [];

  const byField = new Map();
  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;
    const resolved = resolveReviewFieldName(
      item.field || item.name || item.key,
      fieldNames
    );
    if (!resolved) continue;
    const value = truncateText(
      String(item.value ?? item.text ?? item.content ?? "").trim(),
      PROMPT_LIMITS.SYLLABUS_DRAFT_FIELD_CHARS
    );
    if (!value) continue;
    byField.set(resolved, { field: resolved, value });
  }

  // fields 객체가 맵 형태인 경우
  if (byField.size === 0 && parsed.fields && typeof parsed.fields === "object") {
    for (const [key, val] of Object.entries(parsed.fields)) {
      const resolved = resolveReviewFieldName(key, fieldNames);
      if (!resolved) continue;
      const value = truncateText(
        String(val ?? "").trim(),
        PROMPT_LIMITS.SYLLABUS_DRAFT_FIELD_CHARS
      );
      if (!value) continue;
      byField.set(resolved, { field: resolved, value });
    }
  }

  const items = [];
  if (fieldNames.length > 0) {
    for (const field of fieldNames) {
      if (byField.has(field)) items.push(byField.get(field));
      else items.push({ field, value: "" });
    }
  } else {
    items.push(...byField.values());
  }

  if (items.every((it) => !it.value) && !summary) {
    const err = new Error(AI_ERRORS.INVALID_JSON);
    err.code = AI_ERRORS.INVALID_JSON;
    throw err;
  }

  return {
    summary: summary || "제공하신 자료를 바탕으로 강의계획서 초안을 작성했습니다.",
    items,
  };
};

export const buildSyllabusDraftRetryPrompt = (fieldNames = []) => {
  const focus =
    Array.isArray(fieldNames) && fieldNames.length > 0
      ? `\nitems.field는 다음을 빠짐없이 사용: ${fieldNames
          .map((n) => JSON.stringify(n))
          .join(", ")}`
      : "";
  return `이전 응답이 유효한 JSON이 아닙니다. 설명·마크다운·코드펜스 없이 JSON 객체 하나만 출력하세요.
{
  "summary": "초안 요약 1~2문장",
  "items": [
    { "field": "필드명", "value": "해당 항목 작성문" }
  ]
}
작성 대상 항목은 모두 비어 있지 않은 value로 채우세요. 자료가 짧아도 교과·수업명·지침에 맞게 합리적인 초안을 넣으세요.${focus}`;
};

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
export const repairAndParseJson = (text, { allowArray = false } = {}) => {
  let candidate = extractJsonCandidate(text);
  if (!candidate) {
    const raw = String(text || "").trim();
    const arrStart = raw.indexOf("[");
    if (arrStart >= 0) candidate = raw.slice(arrStart);
  }
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
      if (Array.isArray(parsed)) {
        if (allowArray) return parsed;
        continue;
      }
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch (_) {
      // next attempt
    }
  }
  return null;
};

