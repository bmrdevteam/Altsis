/**
 * Fence fallback. Models without native tools still return toolCalls.
 * The loop only sees { text, toolCalls }.
 */

const FENCE_RE = /```([a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/g;

const NATIVE_FORMAT_ERROR =
  "도구가 필요하면 제공된 도구를 호출하고, 아니면 한국어 문장으로 답하세요.";
const FENCE_FORMAT_ERROR =
  '도구를 호출하려면 설명 없이 ```alter 펜스 하나만 보내세요. 답이면 {"type":"final","text":"..."} 펜스로 보내고 펜스를 닫으세요.';

const objectArgs = (raw) =>
  raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

const fenceToolText = (call) =>
  [
    "```alter",
    JSON.stringify({
      type: "tool",
      name: call.name,
      arguments: objectArgs(call.arguments),
    }),
    "```",
  ].join("\n");

const translate = (text) => String(text || "").split(NATIVE_FORMAT_ERROR).join(FENCE_FORMAT_ERROR);

/** Native tool messages become the fence transcript the model already expects. */
export const toFenceTranscript = (messages) =>
  (messages || []).map((message) => {
    if (message?.role === "tool") {
      return { role: "user", content: translate(message.content) };
    }
    if (message?.role === "assistant" && Array.isArray(message.toolCalls) && message.toolCalls.length) {
      const text = String(message.content || "");
      const content = text.includes("```")
        ? text
        : message.toolCalls.map((call) => fenceToolText(call)).join("\n");
      return { role: "assistant", content: translate(content) };
    }
    const content = typeof message?.content === "string" ? message.content : "";
    return {
      role: message?.role === "assistant" ? "assistant" : "user",
      content: translate(content),
    };
  });

const fenceObjects = (raw) => {
  const found = [];
  const re = new RegExp(FENCE_RE.source, "g");
  let match = re.exec(String(raw || ""));
  while (match) {
    const lang = String(match[1] || "").trim().toLowerCase();
    if (!lang || lang === "alter" || lang === "json") {
      try {
        const value = JSON.parse(String(match[2] || "").trim());
        if (value && typeof value === "object" && !Array.isArray(value)) found.push(value);
      } catch (_) {}
    }
    match = re.exec(String(raw || ""));
  }
  return found;
};

/**
 * A tool fence becomes toolCalls. A final fence becomes plain text.
 * Anything else is left for the caller to read as text.
 */
export const parseFenceTurn = (result = {}) => {
  const existing = Array.isArray(result.toolCalls) ? result.toolCalls : [];
  if (existing.length) {
    return {
      text: String(result.text || ""),
      toolCalls: existing,
      usage: result.usage || null,
      finish: result.finish || "tool_calls",
    };
  }
  const text = String(result.text || "");
  const objects = fenceObjects(text);
  const tool = objects.find((obj) => {
    const type = String(obj.type || obj.action || "").toLowerCase();
    return type === "tool" || type === "tool_call" || type === "call";
  });
  if (tool) {
    const name = String(tool.name || tool.tool || "").trim();
    if (name) {
      return {
        text: "",
        toolCalls: [
          {
            id: "fence-0",
            name: name.slice(0, 64),
            arguments: objectArgs(tool.arguments || tool.args),
          },
        ],
        usage: result.usage || null,
        finish: "tool_calls",
      };
    }
  }
  const finalAction = objects.find((obj) => {
    const type = String(obj.type || obj.action || "").toLowerCase();
    return type === "final" || type === "answer" || type === "done";
  });
  if (finalAction) {
    return {
      text: String(finalAction.text || finalAction.message || finalAction.content || "").trim(),
      toolCalls: [],
      usage: result.usage || null,
      finish: "stop",
    };
  }
  return {
    text,
    toolCalls: [],
    usage: result.usage || null,
    finish: result.finish || "stop",
  };
};

/**
 * @param {{ id: string, capabilities: object, generate: Function }} adapter
 * @param {{ renderSystem?: (req: object) => string }} [options]
 */
export const withFenceTools = (adapter, options = {}) => ({
  id: adapter.id,
  capabilities: { ...adapter.capabilities, nativeTools: false },
  async generate(req = {}) {
    const system =
      typeof options.renderSystem === "function" ? options.renderSystem(req) : req.system;
    const inner = await adapter.generate({
      ...req,
      system,
      messages: toFenceTranscript(req.messages),
      tools: undefined,
      toolChoice: undefined,
    });
    return parseFenceTurn(inner);
  },
});
