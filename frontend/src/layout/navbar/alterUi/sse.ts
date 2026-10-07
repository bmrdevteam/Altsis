export type AlterSseDone = {
  draft?: any;
  review?: any;
  message?: string;
  skill?: string;
  conversationId?: string | null;
  links?: any[];
  images?: { url: string; alt?: string }[];
  scheduleProposal?: any;
};

export type AlterSseHandlers = {
  onStep: (message: string) => void;
  onActivity?: () => void;
};

const ERROR_TEXT: Record<string, string> = {
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
  AI_PERMISSION_DENIED: "AI 사용 권한이 없습니다.",
  AI_USAGE_LIMIT_EXCEEDED: "오늘 AI 사용량(Alt) 한도를 초과했습니다. 관리자에게 문의해 주세요.",
  AI_TIMEOUT: "응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.",
  PERMISSION_DENIED: "권한이 없습니다.",
  FORBIDDEN: "권한이 없습니다.",
  NOT_FOUND: "찾을 수 없습니다.",
  SEASON_NOT_FOUND: "학기를 찾을 수 없습니다.",
  SEASON_REQUIRED: "학기가 필요합니다.",
  REGISTRATION_NOT_FOUND: "학기 등록을 찾을 수 없습니다.",
  FILE_REQUIRED: "파일이 필요합니다.",
  LIMIT_REACHED: "한도에 도달했습니다.",
  PROVIDER_ERROR: "AI 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  TOOL_ERROR: "도구 실행에 실패했습니다.",
  INVALID_INPUT: "입력값을 확인해 주세요.",
  PLAN_CTRL_REQUIRED: "CTRL 플랜이 꺼져 있어 AI를 사용할 수 없습니다.",
  PLAN_SHIFT_REQUIRED: "SHIFT 플랜이 꺼져 있어 이 기능을 사용할 수 없습니다.",
  ACADEMY_NOT_FOUND: "아카데미를 찾을 수 없습니다.",
  ACADEMY_TOKEN_LIMIT: "아카데미 이번 달 AI 토큰 한도에 도달했습니다. 소유자에게 한도 상향을 요청하세요.",
};

const HANGUL = /[가-힣]/;

/** Prefer a Korean message. Otherwise map a stable code. */
export const friendlyAlterError = (
  data?: { code?: string; message?: string } | null,
  fallback = "AI 처리 중 오류가 발생했습니다."
) => {
  const message = String(data?.message || "").trim();
  if (HANGUL.test(message)) return message;
  const code = String(data?.code || "").trim();
  return ERROR_TEXT[message] || ERROR_TEXT[code] || message || fallback;
};

const toolStep = (data: { label?: string; name?: string; status?: string; summary?: string }) => {
  const label = data.label || data.name || "도구";
  if (data.status === "running") return `${label} 조회 중…`;
  if (data.status === "done") return data.summary ? `${label}: ${data.summary}` : `${label} 완료`;
  if (data.status === "error") return data.summary ? `${label}: ${data.summary}` : `${label} 실패`;
  return "";
};

export type ParsedSse = {
  kind: "step" | "tool" | "error" | "done";
  step?: string;
  error?: string;
  conversationId?: string | null;
  done?: AlterSseDone;
};

const parseBlock = (block: string): ParsedSse | null => {
  let eventType = "";
  let dataLine = "";
  for (const raw of block.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event: ")) eventType = line.slice(7).trim();
    else if (line.startsWith("data: ")) dataLine = line.slice(6);
  }
  if (!eventType || !dataLine) return null;
  try {
    const data = JSON.parse(dataLine);
    if (eventType === "step") return { kind: "step", step: data.message || "" };
    if (eventType === "tool") return { kind: "tool", step: toolStep(data) };
    if (eventType === "error") {
      return {
        kind: "error",
        error: friendlyAlterError(data),
        conversationId: data.conversationId,
      };
    }
    if (eventType === "done") {
      return {
        kind: "done",
        done: {
          draft: data.draft || null,
          review: data.review || null,
          message: data.message || data.text || "",
          skill: data.skill,
          conversationId: data.conversationId || null,
          links: data.links || [],
          images: Array.isArray(data.images) ? data.images : [],
          scheduleProposal: data.scheduleProposal || null,
        },
      };
    }
  } catch {
    // ignore a bad data line, same as the panel used to
  }
  return null;
};

/** Complete events end with a blank line. An unfinished block stays in rest. */
export const takeSseEvents = (buffer: string) => {
  const parts = buffer.split(/\n\n/);
  const rest = parts.pop() ?? "";
  const events: ParsedSse[] = [];
  for (const block of parts) {
    const event = parseBlock(block);
    if (event) events.push(event);
  }
  return { rest, events };
};

export const readAlterSse = async (
  response: { ok: boolean; body: ReadableStream<Uint8Array> | null },
  handlers: AlterSseHandlers
): Promise<AlterSseDone> => {
  if (!response.ok || !response.body) {
    throw new Error("AI 요청에 실패했습니다.");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: AlterSseDone = {};
  let errMsg = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    handlers.onActivity?.();
    buffer += decoder.decode(value, { stream: true });
    const parsed = takeSseEvents(buffer);
    buffer = parsed.rest;
    for (const event of parsed.events) {
      if (event.kind === "step" || event.kind === "tool") {
        if (event.step) handlers.onStep(event.step);
      } else if (event.kind === "error") {
        errMsg = event.error || "AI 처리 중 오류가 발생했습니다.";
        if (event.conversationId) result = { ...result, conversationId: event.conversationId };
      } else if (event.kind === "done" && event.done) {
        result = event.done;
      }
    }
  }
  if (errMsg) throw new Error(errMsg);
  return result;
};
