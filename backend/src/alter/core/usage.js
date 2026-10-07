/**
 * Four-field token counts shared by the agent loop and tool results.
 * Provider wire formats stay in providers/usage.js.
 */

export const asUsage = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  return {
    promptTokens: Number(raw.promptTokens) || 0,
    candidatesTokens: Number(raw.candidatesTokens) || 0,
    thoughtsTokens: Number(raw.thoughtsTokens) || 0,
    totalTokens: Number(raw.totalTokens) || 0,
  };
};

/** Add a usage object. A missing side leaves the other unchanged. */
export const addUsage = (current, raw) => {
  const next = asUsage(raw);
  if (!next) return current || null;
  const prev = asUsage(current) || {
    promptTokens: 0,
    candidatesTokens: 0,
    thoughtsTokens: 0,
    totalTokens: 0,
  };
  return {
    promptTokens: prev.promptTokens + next.promptTokens,
    candidatesTokens: prev.candidatesTokens + next.candidatesTokens,
    thoughtsTokens: prev.thoughtsTokens + next.thoughtsTokens,
    totalTokens: prev.totalTokens + next.totalTokens,
  };
};
