/**
 * ProviderAdapter
 * id: "openai" | "anthropic" | "gemini" | "scripted"
 * capabilities: { nativeTools, streaming, images }
 * generate({ system, messages, tools, toolChoice, temperature, maxTokens, signal,
 *   apiKey, model, scriptedPlan, pageNote, guidelines, forceFinal })
 *   → { text, toolCalls, usage, finish }
 *
 * tools are the registry's neutral schemas: { name, description, parameters }.
 * usage is always { promptTokens, candidatesTokens, thoughtsTokens, totalTokens } or null.
 * finish is "stop" | "tool_calls" | "length".
 */

import { normalizeFinish, normalizeToolCalls, normalizeUsage } from "./usage.js";

/**
 * @param {{ text?: string, toolCalls?: object[], usage?: object|null, finish?: string }} turn
 */
export const normalizeTurn = (turn = {}) => {
  const toolCalls = normalizeToolCalls(turn.toolCalls);
  return {
    text: String(turn.text || ""),
    toolCalls,
    usage: normalizeUsage(turn.usage),
    finish: normalizeFinish(turn.finish, toolCalls),
  };
};
