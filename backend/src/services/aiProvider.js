/**
 * AI Provider Service
 * @description AI 제공자(OpenAI/Anthropic/Gemini) 추상화 계층.
 * 모든 어댑터는 Node 내장 fetch 기반으로 동작하며,
 * 메시지는 중립 형식({ role: "user" | "assistant", content: string })을 사용한다.
 *
 * Gemini는 Google 약관(18세 미만 접근 가능 서비스에 사용 금지)상
 * 운영 환경에서 사용할 수 없으므로 테스트 용도로만 제공한다.
 */

const DEFAULT_MAX_TOKENS = 8192;

export const AI_PROVIDERS = {
  openai: {
    label: "OpenAI",
    defaultModel: "gpt-4o-mini",
  },
  anthropic: {
    label: "Anthropic",
    defaultModel: "claude-sonnet-4-5",
  },
  gemini: {
    label: "Google Gemini (테스트용)",
    // 신규 키에는 gemini-2.5-flash가 제공되지 않음 (Google 2026 정책)
    defaultModel: "gemini-3.6-flash",
  },
};

export const isValidProvider = (provider) =>
  typeof provider === "string" && provider in AI_PROVIDERS;

/**
 * Academy 문서에서 제공자 결정 (기존 아카데미는 gemini 키만 저장되어 있으므로 gemini로 폴백)
 */
export const resolveProvider = (provider) =>
  isValidProvider(provider) ? provider : "gemini";

export const resolveModel = (provider, model) =>
  model || AI_PROVIDERS[resolveProvider(provider)].defaultModel;

/**
 * 제공자 ListModels 결과에서 실제 사용 가능한 모델을 고른다.
 * preferred가 목록에 있으면 그대로 쓰고, 없으면 저렴·빠른 계열을 우선한다.
 * @param {Array<{name: string, displayName?: string}>} models
 * @param {string} [preferred]
 * @returns {string|null}
 */
export const pickPreferredModel = (models, preferred) => {
  if (!models?.length) return null;
  if (preferred && models.some((m) => m.name === preferred)) {
    return preferred;
  }

  const usable = models.filter(
    (m) => !/image|tts|embed|whisper|moderation|realtime|audio/i.test(m.name)
  );
  const pool = usable.length ? usable : models;

  const patterns = [
    /^gpt-4o-mini$/i,
    /^gpt-4o-mini/i,
    /^gpt-4\.1-mini/i,
    /^gpt-4o(?!.*mini)/i,
    /claude-sonnet/i,
    /claude-.*sonnet/i,
    /gemini-.*flash(?!.*image)/i,
    /flash(?!.*image)/i,
    /mini/i,
  ];
  for (const re of patterns) {
    const hit = pool.find((m) => re.test(m.name));
    if (hit) return hit.name;
  }
  return pool[0].name;
};

/** 생성 요청 기본 타임아웃 (ms) — 무응답 hang 방지 */
const DEFAULT_GENERATE_TIMEOUT_MS = 90_000;

/**
 * timeout이 있는 fetch. AbortError는 status=504로 정규화한다.
 */
const fetchWithTimeout = async (
  url,
  options = {},
  timeoutMs = DEFAULT_GENERATE_TIMEOUT_MS
) => {
  const controller = new AbortController();
  const external = options.signal;
  const onExternalAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", onExternalAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err?.name === "AbortError") {
      const timeoutErr = new Error(
        `AI 응답 시간이 초과되었습니다. (${Math.round(timeoutMs / 1000)}초)`
      );
      timeoutErr.status = 504;
      timeoutErr.code = "AI_TIMEOUT";
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (external) external.removeEventListener("abort", onExternalAbort);
  }
};

/**
 * HTTP 에러를 status 정보와 함께 throw
 */
const throwHttpError = async (response, provider) => {
  let detail = "";
  let apiMessage = "";
  try {
    const body = await response.text();
    detail = body.slice(0, 500);
    try {
      apiMessage = JSON.parse(body)?.error?.message || "";
    } catch (_) {}
  } catch (_) {}
  const err = new Error(
    `${provider} API error (${response.status}): ${detail}`
  );
  err.status = response.status;
  err.apiMessage = apiMessage;
  throw err;
};

/**
 * SSE 응답 바디에서 data 페이로드를 순회
 */
async function* iterateSSE(response) {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const data = rawEvent
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data) yield data;
    }
  }
}

/* ==========================================================================
 * OpenAI (Chat Completions API)
 * ========================================================================== */

const openaiBuildBody = ({
  model,
  systemInstruction,
  messages,
  temperature,
  maxTokens,
}) => {
  const body = {
    model,
    messages: [
      ...(systemInstruction
        ? [{ role: "system", content: systemInstruction }]
        : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };
  if (typeof temperature === "number") body.temperature = temperature;
  if (typeof maxTokens === "number") body.max_tokens = maxTokens;
  return body;
};

const openaiUsage = (usage) => {
  if (!usage) return null;
  return {
    promptTokens: usage.prompt_tokens || 0,
    candidatesTokens: usage.completion_tokens || 0,
    thoughtsTokens: usage.completion_tokens_details?.reasoning_tokens || 0,
    totalTokens: usage.total_tokens || 0,
  };
};

const openaiGenerate = async ({
  apiKey,
  model,
  systemInstruction,
  messages,
  temperature,
  maxTokens,
}) => {
  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(
        openaiBuildBody({
          model,
          systemInstruction,
          messages,
          temperature,
          maxTokens,
        })
      ),
    }
  );
  if (!response.ok) await throwHttpError(response, "openai");

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || "",
    tokenUsage: openaiUsage(data.usage),
  };
};

const openaiGenerateStream = async (
  { apiKey, model, systemInstruction, messages, temperature, maxTokens },
  onText
) => {
  const body = openaiBuildBody({
    model,
    systemInstruction,
    messages,
    temperature,
    maxTokens,
  });
  body.stream = true;
  body.stream_options = { include_usage: true };

  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
    120_000
  );
  if (!response.ok) await throwHttpError(response, "openai");

  let fullText = "";
  let tokenUsage = null;
  for await (const data of iterateSSE(response)) {
    if (data === "[DONE]") break;
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (_) {
      continue;
    }
    const delta = parsed.choices?.[0]?.delta?.content;
    if (delta) {
      fullText += delta;
      onText(delta);
    }
    if (parsed.usage) tokenUsage = openaiUsage(parsed.usage);
  }
  return { text: fullText, tokenUsage };
};

const openaiListModels = async ({ apiKey }) => {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) await throwHttpError(response, "openai");

  const data = await response.json();
  const excluded = [
    "embedding",
    "whisper",
    "tts",
    "dall-e",
    "audio",
    "realtime",
    "moderation",
    "image",
    "transcribe",
    "search",
    "instruct",
    "babbage",
    "davinci",
  ];
  return (data.data || [])
    .filter(
      (m) =>
        /^(gpt|o\d|chatgpt)/.test(m.id) &&
        !excluded.some((keyword) => m.id.includes(keyword))
    )
    .sort((a, b) => (b.created || 0) - (a.created || 0))
    .map((m) => ({ name: m.id, displayName: m.id }));
};

/* ==========================================================================
 * Anthropic (Messages API)
 * ========================================================================== */

const ANTHROPIC_VERSION = "2023-06-01";

const anthropicHeaders = (apiKey) => ({
  "Content-Type": "application/json",
  "x-api-key": apiKey,
  "anthropic-version": ANTHROPIC_VERSION,
});

/**
 * Anthropic은 user/assistant 역할이 교대로 나와야 하므로 연속된 같은 역할 메시지를 병합
 */
const anthropicMergeMessages = (messages) => {
  const merged = [];
  for (const m of messages) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) {
      last.content += `\n\n${m.content}`;
    } else {
      merged.push({ role: m.role, content: m.content });
    }
  }
  // 첫 메시지는 user여야 함
  if (merged.length > 0 && merged[0].role !== "user") {
    merged.unshift({ role: "user", content: "(대화 시작)" });
  }
  return merged;
};

const anthropicBuildBody = ({
  model,
  systemInstruction,
  messages,
  temperature,
  maxTokens,
}) => ({
  model,
  max_tokens: typeof maxTokens === "number" ? maxTokens : DEFAULT_MAX_TOKENS,
  ...(typeof temperature === "number" ? { temperature } : {}),
  ...(systemInstruction ? { system: systemInstruction } : {}),
  messages: anthropicMergeMessages(messages),
});

const anthropicUsage = (usage) => {
  if (!usage) return null;
  const promptTokens = usage.input_tokens || 0;
  const candidatesTokens = usage.output_tokens || 0;
  return {
    promptTokens,
    candidatesTokens,
    thoughtsTokens: 0,
    totalTokens: promptTokens + candidatesTokens,
  };
};

const anthropicGenerate = async ({
  apiKey,
  model,
  systemInstruction,
  messages,
  temperature,
  maxTokens,
}) => {
  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: anthropicHeaders(apiKey),
      body: JSON.stringify(
        anthropicBuildBody({
          model,
          systemInstruction,
          messages,
          temperature,
          maxTokens,
        })
      ),
    }
  );
  if (!response.ok) await throwHttpError(response, "anthropic");

  const data = await response.json();
  const text = (data.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  return { text, tokenUsage: anthropicUsage(data.usage) };
};

const anthropicGenerateStream = async (
  { apiKey, model, systemInstruction, messages, temperature, maxTokens },
  onText
) => {
  const body = anthropicBuildBody({
    model,
    systemInstruction,
    messages,
    temperature,
    maxTokens,
  });
  body.stream = true;

  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: anthropicHeaders(apiKey),
      body: JSON.stringify(body),
    },
    120_000
  );
  if (!response.ok) await throwHttpError(response, "anthropic");

  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  for await (const data of iterateSSE(response)) {
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (_) {
      continue;
    }
    if (parsed.type === "message_start") {
      inputTokens = parsed.message?.usage?.input_tokens || 0;
    } else if (
      parsed.type === "content_block_delta" &&
      parsed.delta?.type === "text_delta"
    ) {
      fullText += parsed.delta.text;
      onText(parsed.delta.text);
    } else if (parsed.type === "message_delta") {
      outputTokens = parsed.usage?.output_tokens || outputTokens;
    } else if (parsed.type === "error") {
      const err = new Error(
        `anthropic stream error: ${parsed.error?.message || "unknown"}`
      );
      err.status = parsed.error?.type === "overloaded_error" ? 529 : 500;
      throw err;
    }
  }
  const tokenUsage =
    inputTokens || outputTokens
      ? {
          promptTokens: inputTokens,
          candidatesTokens: outputTokens,
          thoughtsTokens: 0,
          totalTokens: inputTokens + outputTokens,
        }
      : null;
  return { text: fullText, tokenUsage };
};

const anthropicListModels = async ({ apiKey }) => {
  const response = await fetch(
    "https://api.anthropic.com/v1/models?limit=100",
    { headers: anthropicHeaders(apiKey) }
  );
  if (!response.ok) await throwHttpError(response, "anthropic");

  const data = await response.json();
  return (data.data || []).map((m) => ({
    name: m.id,
    displayName: m.display_name || m.id,
  }));
};

/* ==========================================================================
 * Google Gemini (generativelanguage REST API) - 테스트 전용
 * ========================================================================== */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

const geminiBuildBody = ({
  systemInstruction,
  messages,
  temperature,
  maxTokens,
}) => ({
  ...(systemInstruction
    ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
    : {}),
  contents: messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  })),
  // 강의계획서 등 구조화 생성에서는 thinking 토큰을 최소화
  generationConfig: {
    thinkingConfig: {
      thinkingBudget: 0,
    },
    ...(typeof temperature === "number" ? { temperature } : {}),
    ...(typeof maxTokens === "number" ? { maxOutputTokens: maxTokens } : {}),
  },
});

const geminiUsage = (usageMetadata) => {
  if (!usageMetadata) return null;
  return {
    promptTokens: usageMetadata.promptTokenCount || 0,
    candidatesTokens: usageMetadata.candidatesTokenCount || 0,
    thoughtsTokens: usageMetadata.thoughtsTokenCount || 0,
    totalTokens: usageMetadata.totalTokenCount || 0,
  };
};

const geminiExtractText = (data) =>
  (data.candidates?.[0]?.content?.parts || [])
    // Gemini thinking 모델은 thought 파트와 본문 파트를 함께 보냄
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("");

const geminiNormalizeModel = (model) =>
  String(model || "").replace(/^models\//, "");

const geminiGenerate = async ({
  apiKey,
  model,
  systemInstruction,
  messages,
  temperature,
  maxTokens,
}) => {
  const modelId = geminiNormalizeModel(model);
  let body = geminiBuildBody({
    systemInstruction,
    messages,
    temperature,
    maxTokens,
  });
  const geminiHeaders = {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey,
  };
  let response = await fetchWithTimeout(
    `${GEMINI_BASE}/models/${encodeURIComponent(modelId)}:generateContent`,
    {
      method: "POST",
      headers: geminiHeaders,
      body: JSON.stringify(body),
    }
  );
  // thinkingBudget를 지원하지 않는 모델이면 thinking 설정만 제거하고 재시도
  if (response.status === 400) {
    const nextConfig = { ...(body.generationConfig || {}) };
    delete nextConfig.thinkingConfig;
    body = {
      ...body,
      generationConfig:
        Object.keys(nextConfig).length > 0 ? nextConfig : undefined,
    };
    response = await fetchWithTimeout(
      `${GEMINI_BASE}/models/${encodeURIComponent(modelId)}:generateContent`,
      {
        method: "POST",
        headers: geminiHeaders,
        body: JSON.stringify(body),
      }
    );
  }
  if (!response.ok) await throwHttpError(response, "gemini");

  const data = await response.json();
  return {
    text: geminiExtractText(data),
    tokenUsage: geminiUsage(data.usageMetadata),
  };
};

const geminiGenerateStream = async (
  { apiKey, model, systemInstruction, messages, temperature, maxTokens },
  onText
) => {
  const modelId = geminiNormalizeModel(model);
  let body = geminiBuildBody({
    systemInstruction,
    messages,
    temperature,
    maxTokens,
  });
  const geminiStreamHeaders = {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey,
  };
  let response = await fetchWithTimeout(
    `${GEMINI_BASE}/models/${encodeURIComponent(
      modelId
    )}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: geminiStreamHeaders,
      body: JSON.stringify(body),
    },
    120_000
  );
  if (response.status === 400) {
    const nextConfig = { ...(body.generationConfig || {}) };
    delete nextConfig.thinkingConfig;
    body = {
      ...body,
      generationConfig:
        Object.keys(nextConfig).length > 0 ? nextConfig : undefined,
    };
    response = await fetchWithTimeout(
      `${GEMINI_BASE}/models/${encodeURIComponent(
        modelId
      )}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: geminiStreamHeaders,
        body: JSON.stringify(body),
      },
      120_000
    );
  }
  if (!response.ok) await throwHttpError(response, "gemini");

  let fullText = "";
  let tokenUsage = null;
  for await (const data of iterateSSE(response)) {
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (_) {
      continue;
    }
    const chunkText = geminiExtractText(parsed);
    if (chunkText) {
      fullText += chunkText;
      onText(chunkText);
    }
    if (parsed.usageMetadata) tokenUsage = geminiUsage(parsed.usageMetadata);
  }

  // 스트림이 비어 있으면(thinking만 온 경우 등) non-stream으로 한 번 더 시도
  if (!fullText.trim()) {
    const fallback = await geminiGenerate({
      apiKey,
      model,
      systemInstruction,
      messages,
      temperature,
      maxTokens,
    });
    if (fallback.text) {
      onText(fallback.text);
    }
    return fallback;
  }

  return { text: fullText, tokenUsage };
};

const geminiListModels = async ({ apiKey }) => {
  const response = await fetch(
    `${GEMINI_BASE}/models?key=${encodeURIComponent(apiKey)}`
  );
  if (!response.ok) await throwHttpError(response, "gemini");

  const data = await response.json();
  return (data.models || [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => ({
      name: m.name.replace("models/", ""),
      displayName: m.displayName,
    }));
};

/* ==========================================================================
 * Public API
 * ========================================================================== */

const adapters = {
  openai: {
    generate: openaiGenerate,
    generateStream: openaiGenerateStream,
    listModels: openaiListModels,
  },
  anthropic: {
    generate: anthropicGenerate,
    generateStream: anthropicGenerateStream,
    listModels: anthropicListModels,
  },
  gemini: {
    generate: geminiGenerate,
    generateStream: geminiGenerateStream,
    listModels: geminiListModels,
  },
};

const getAdapter = (provider) => adapters[resolveProvider(provider)];

/**
 * 텍스트 생성 (non-streaming)
 * @param {Object} params
 * @param {string} params.provider - "openai" | "anthropic" | "gemini"
 * @param {string} params.apiKey
 * @param {string} [params.model]
 * @param {string} [params.systemInstruction]
 * @param {Array<{role: "user"|"assistant", content: string}>} params.messages
 * @returns {Promise<{text: string, tokenUsage: Object|null}>}
 */
export const generateText = async ({
  provider,
  apiKey,
  model,
  systemInstruction,
  messages,
  temperature,
  maxTokens,
}) => {
  const resolvedProvider = resolveProvider(provider);
  return getAdapter(resolvedProvider).generate({
    apiKey,
    model: resolveModel(resolvedProvider, model),
    systemInstruction,
    messages,
    temperature,
    maxTokens,
  });
};

/**
 * 텍스트 생성 (streaming)
 * @param {Object} params - generateText와 동일
 * @param {(text: string) => void} onText - 청크 텍스트 콜백
 * @returns {Promise<{text: string, tokenUsage: Object|null}>}
 */
export const generateTextStream = async (
  { provider, apiKey, model, systemInstruction, messages, temperature, maxTokens },
  onText
) => {
  const resolvedProvider = resolveProvider(provider);
  return getAdapter(resolvedProvider).generateStream(
    {
      apiKey,
      model: resolveModel(resolvedProvider, model),
      systemInstruction,
      messages,
      temperature,
      maxTokens,
    },
    onText
  );
};

/**
 * 사용 가능한 모델 목록 조회
 * @returns {Promise<Array<{name: string, displayName: string}>>}
 */
export const listProviderModels = async ({ provider, apiKey }) =>
  getAdapter(provider).listModels({ apiKey });
