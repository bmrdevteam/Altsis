import { normalizeFinish, normalizeUsage } from "./usage.js";

const textFromCandidate = (data) =>
  (data?.candidates?.[0]?.content?.parts || [])
    .filter((part) => !part?.thought && typeof part?.text === "string")
    .map((part) => part.text)
    .join("");

/** Gemini generateContent JSON → normalized turn. Tool calls stay in the fence wrapper. */
export const fromGeminiPayload = (raw = {}) => {
  if (Array.isArray(raw.candidates)) {
    const reason = raw.candidates[0]?.finishReason;
    return {
      text: textFromCandidate(raw),
      toolCalls: [],
      usage: normalizeUsage(raw.usageMetadata),
      finish: normalizeFinish(reason, []),
    };
  }
  return {
    text: String(raw.text || ""),
    toolCalls: [],
    usage: normalizeUsage(raw.tokenUsage || raw.usage || raw.usageMetadata),
    finish: normalizeFinish(raw.finish || raw.finishReason, []),
  };
};

/** @param {{ complete: (req: object) => Promise<object> }} deps */
export const createGeminiAdapter = ({ complete }) => ({
  id: "gemini",
  capabilities: { nativeTools: false, streaming: true, images: true },
  async generate(req) {
    const raw = await complete(req);
    return fromGeminiPayload(raw);
  },
});
