import { normalizeFinish, normalizeToolCalls, normalizeUsage, parseArguments } from "./usage.js";

/** OpenAI Chat Completions JSON → normalized turn. */
export const fromOpenAIPayload = (raw = {}) => {
  if (Array.isArray(raw.choices)) {
    const choice = raw.choices[0] || {};
    const message = choice.message || {};
    const toolCalls = normalizeToolCalls(
      (Array.isArray(message.tool_calls) ? message.tool_calls : []).map((call) => ({
        id: call?.id,
        name: call?.function?.name,
        arguments: parseArguments(call?.function?.arguments),
      }))
    );
    const text =
      typeof message.content === "string"
        ? message.content
        : Array.isArray(message.content)
          ? message.content.map((part) => part?.text || "").join("")
          : "";
    return {
      text,
      toolCalls,
      usage: normalizeUsage(raw.usage),
      finish: normalizeFinish(choice.finish_reason, toolCalls),
    };
  }
  const toolCalls = normalizeToolCalls(raw.toolCalls);
  return {
    text: String(raw.text || ""),
    toolCalls,
    usage: normalizeUsage(raw.tokenUsage || raw.usage),
    finish: normalizeFinish(raw.finish || raw.finish_reason, toolCalls),
  };
};

/** @param {{ complete: (req: object) => Promise<object> }} deps */
export const createOpenAIAdapter = ({ complete }) => ({
  id: "openai",
  capabilities: { nativeTools: true, streaming: true, images: true },
  async generate(req) {
    const raw = await complete(req);
    return fromOpenAIPayload(raw);
  },
});
