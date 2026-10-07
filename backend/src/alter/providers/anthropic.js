import { normalizeFinish, normalizeToolCalls, normalizeUsage } from "./usage.js";

const textFromBlocks = (content) =>
  (Array.isArray(content) ? content : [])
    .filter((block) => block?.type === "text" && block.text != null)
    .map((block) => String(block.text))
    .join("");

/** Anthropic Messages JSON → normalized turn. */
export const fromAnthropicPayload = (raw = {}) => {
  if (Array.isArray(raw.content) && (raw.usage || raw.stop_reason)) {
    const toolCalls = normalizeToolCalls(
      raw.content
        .filter((block) => block?.type === "tool_use")
        .map((block) => ({
          id: block.id,
          name: block.name,
          arguments: block.input,
        }))
    );
    return {
      text: textFromBlocks(raw.content),
      toolCalls,
      usage: normalizeUsage(raw.usage),
      finish: normalizeFinish(raw.stop_reason, toolCalls),
    };
  }
  const toolCalls = normalizeToolCalls(raw.toolCalls);
  return {
    text: String(raw.text || ""),
    toolCalls,
    usage: normalizeUsage(raw.tokenUsage || raw.usage),
    finish: normalizeFinish(raw.finish || raw.stop_reason, toolCalls),
  };
};

/** @param {{ complete: (req: object) => Promise<object> }} deps */
export const createAnthropicAdapter = ({ complete }) => ({
  id: "anthropic",
  capabilities: { nativeTools: true, streaming: true, images: true },
  async generate(req) {
    const raw = await complete(req);
    return fromAnthropicPayload(raw);
  },
});
