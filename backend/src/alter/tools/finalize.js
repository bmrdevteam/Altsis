/**
 * Registry result policy. Tools return raw data. Masking and the size cap
 * live here so every tool takes the same path.
 */

import { MAX_TOOL_RESULT_CHARS } from "../core/limits.js";
import { maskSensitiveObject } from "../core/safety.js";

const summaryOf = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value) && typeof value.summary === "string") {
    return value.summary.slice(0, 180);
  }
  return "결과가 잘렸습니다.";
};

/** Mask when the tool says the payload is untrusted, then keep the JSON under the cap. */
export const finalizeToolResult = (tool, value) => {
  const masked = tool?.untrustedOutput ? maskSensitiveObject(value) : value;
  const json = JSON.stringify(masked ?? null);
  if (json.length <= MAX_TOOL_RESULT_CHARS) return masked;
  const capped = { summary: summaryOf(masked), truncated: true, data: "" };
  const overhead = JSON.stringify({ ...capped, data: "" }).length;
  capped.data = json.slice(0, Math.max(0, MAX_TOOL_RESULT_CHARS - overhead));
  while (JSON.stringify(capped).length > MAX_TOOL_RESULT_CHARS && capped.data.length > 0) {
    const step = Math.max(1, Math.ceil(capped.data.length * 0.05));
    capped.data = capped.data.slice(0, -step);
  }
  return capped;
};
