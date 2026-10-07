/**
 * One Alter error. HTTP and SSE send { code, message } with a Korean message.
 * Internal text stays in the log.
 */

export const ALTER_ERROR_CODES = Object.freeze({
  AI_NOT_ENABLED: "AI_NOT_ENABLED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  LIMIT_REACHED: "LIMIT_REACHED",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  TOOL_ERROR: "TOOL_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
});

const HANGUL = /[가-힣]/;
const INTERNAL_TEXT = /SQL이 비어|SQL 실행에 실패|SELECT 문만|한 개의 SELECT|조회\(SELECT\) 외/;

/** Korean text for codes that used to travel as the message itself. */
const CODE_TEXT = {
  AI_NOT_ENABLED: "AI 기능이 활성화되지 않았습니다.",
  AI_NOT_ENABLED_FOR_SEASON: "이 학기에서 AI 기능이 활성화되지 않았습니다.",
  AI_API_KEY_NOT_SET: "AI API 키가 설정되지 않았습니다.",
  AI_NOT_AVAILABLE: "AI 기능을 사용할 수 없습니다.",
  AI_EMPTY_RESPONSE: "AI가 빈 응답을 반환했습니다. 모델 설정을 확인하거나 다시 시도해주세요.",
  AI_INVALID_JSON: "AI 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.",
  AI_MODEL_NOT_FOUND: "AI 모델을 찾을 수 없습니다. 모델 설정을 확인해주세요.",
  AI_INVALID_API_KEY: "AI API 키가 유효하지 않습니다. 설정을 확인해주세요.",
  AI_GENERATION_FAILED: "AI 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  AI_CONTENT_BLOCKED: "안전 정책에 의해 응답이 차단되었습니다.",
  AI_USAGE_LIMIT_EXCEEDED: "오늘 AI 사용량(Alt) 한도를 초과했습니다. 관리자에게 문의해 주세요.",
  AI_PERMISSION_DENIED: "AI 사용 권한이 없습니다.",
  AI_TIMEOUT: "응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.",
  PERMISSION_DENIED: "권한이 없습니다.",
  PLAN_CTRL_REQUIRED: "CTRL 플랜이 꺼져 있어 AI를 사용할 수 없습니다.",
  PLAN_SHIFT_REQUIRED: "SHIFT 플랜이 꺼져 있어 이 기능을 사용할 수 없습니다.",
  ACADEMY_TOKEN_LIMIT: "아카데미 이번 달 AI 토큰 한도에 도달했습니다. 소유자에게 한도 상향을 요청하세요.",
  ACADEMY_NOT_FOUND: "아카데미를 찾을 수 없습니다.",
  SEASON_NOT_FOUND: "학기를 찾을 수 없습니다.",
  SEASON_REQUIRED: "학기가 필요합니다.",
  REGISTRATION_NOT_FOUND: "학기 등록을 찾을 수 없습니다.",
  FILE_REQUIRED: "파일이 필요합니다.",
  NOT_FOUND: "찾을 수 없습니다.",
  FORBIDDEN: "권한이 없습니다.",
  LIMIT_REACHED: "한도에 도달했습니다.",
  PROVIDER_ERROR: "AI 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  TOOL_ERROR: "도구 실행에 실패했습니다.",
  INVALID_INPUT: "입력값을 확인해 주세요.",
  INVALID_SCHEDULE: "입력값을 확인해 주세요.",
};

const fallbackCode = (status) => {
  if (status === 400) return ALTER_ERROR_CODES.INVALID_INPUT;
  if (status === 401 || status === 403) return ALTER_ERROR_CODES.FORBIDDEN;
  if (status === 404) return ALTER_ERROR_CODES.NOT_FOUND;
  if (status === 409 || status === 429) return ALTER_ERROR_CODES.LIMIT_REACHED;
  return ALTER_ERROR_CODES.PROVIDER_ERROR;
};

export class AlterError extends Error {
  constructor(code, status, userMessage, options = {}) {
    const stable = String(code || "").trim() || fallbackCode(status);
    const text = String(userMessage || "").trim();
    super(text || CODE_TEXT[stable] || CODE_TEXT.PROVIDER_ERROR);
    this.name = "AlterError";
    this.code = stable;
    this.status = Number(status) || 500;
    if (options.skip != null) this.skip = options.skip;
    if (options.retryable != null) this.retryable = options.retryable;
  }
}

const knownText = (code) => CODE_TEXT[String(code || "").trim()] || "";

/**
 * Wire body for Alter HTTP and SSE. Status is unchanged.
 * A Hangul message is kept. A code or an internal English string is not.
 */
export const toPublicAlterError = (err) => {
  const status = Number(err?.status) || 500;
  const raw = String(err?.message || "").trim();
  let code = String(err?.code || "").trim();
  if (!code && knownText(raw)) code = raw;
  if (code === "INVALID_SCHEDULE") code = ALTER_ERROR_CODES.INVALID_INPUT;
  if (!code) code = fallbackCode(status);
  const keepRaw = HANGUL.test(raw) && !knownText(raw) && !INTERNAL_TEXT.test(raw);
  const message = keepRaw
    ? raw
    : knownText(code) || knownText(raw) || knownText(fallbackCode(status));
  return { status, code, message };
};
