/**
 * One usage shape for every provider. Cost views read these four counts.
 * @param {object|null|undefined} usage
 * @returns {{ promptTokens: number, candidatesTokens: number, thoughtsTokens: number, totalTokens: number } | null}
 */
export const normalizeUsage = (usage) => {
  if (!usage || typeof usage !== "object") return null;
  const promptTokens = Number(
    usage.promptTokens ?? usage.prompt_tokens ?? usage.input_tokens ?? usage.promptTokenCount ?? 0
  );
  const candidatesTokens = Number(
    usage.candidatesTokens ??
      usage.completion_tokens ??
      usage.output_tokens ??
      usage.candidatesTokenCount ??
      0
  );
  const thoughtsTokens = Number(
    usage.thoughtsTokens ??
      usage.completion_tokens_details?.reasoning_tokens ??
      usage.thoughtsTokenCount ??
      0
  );
  const explicitTotal =
    usage.totalTokens ?? usage.total_tokens ?? usage.totalTokenCount;
  const totalTokens =
    explicitTotal == null ? promptTokens + candidatesTokens : Number(explicitTotal);
  return {
    promptTokens: Number.isFinite(promptTokens) ? promptTokens : 0,
    candidatesTokens: Number.isFinite(candidatesTokens) ? candidatesTokens : 0,
    thoughtsTokens: Number.isFinite(thoughtsTokens) ? thoughtsTokens : 0,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : 0,
  };
};

/** @param {unknown} raw @param {object[]} [toolCalls] */
export const normalizeFinish = (raw, toolCalls = []) => {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "length" || value === "max_tokens") return "length";
  if (value === "tool_calls" || value === "tool_use") return "tool_calls";
  if (Array.isArray(toolCalls) && toolCalls.length) return "tool_calls";
  return "stop";
};

/** @param {unknown} raw */
export const parseArguments = (raw) => {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return {};
  try {
    const value = JSON.parse(raw);
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  } catch (_) {}
  return {};
};

/** @param {object[]} calls */
export const normalizeToolCalls = (calls) =>
  (Array.isArray(calls) ? calls : [])
    .map((call, index) => ({
      id: String(call?.id || `call_${index}`),
      name: String(call?.name || call?.function?.name || "").trim(),
      arguments: parseArguments(call?.arguments ?? call?.function?.arguments ?? call?.input),
    }))
    .filter((call) => call.name);
