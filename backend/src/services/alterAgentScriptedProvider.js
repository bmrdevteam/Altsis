/**
 * Dev/test stand-in for the Alter agent loop.
 *
 * Active only outside production, and only for the academy whose aiApiKey is
 * the dummy SCRIPTED_AGENT_API_KEY. A second academy on the same process with
 * a real key still calls the real provider. Other skills are never stubbed.
 */

/** Dummy academy.aiApiKey that selects the scripted agent. Not a secret. */
export const SCRIPTED_AGENT_API_KEY = "scripted-local-dev";

const TOKEN_USAGE = {
  promptTokens: 8,
  candidatesTokens: 24,
  thoughtsTokens: 0,
  totalTokens: 32,
};

const TOOL_TURN = [
  "```alter",
  JSON.stringify({
    type: "tool",
    name: "get_my_todos",
    arguments: { scope: "all", limit: 10 },
  }),
  "```",
].join("\n");

const FINAL_TEXT =
  "로그인한 계정의 할 일을 조회했습니다. 보드에는 필수 양식 「출석 점검」이 남아 있고, 수업 「문학 탐구」는 확인이 필요합니다.";

const FINAL_TURN = [
  "```alter",
  JSON.stringify({ type: "final", text: FINAL_TEXT }),
  "```",
].join("\n");

export const isAlterAgentScriptedEnabled = (apiKey) => {
  if (String(process.env.NODE_ENV || "").trim() === "production") return false;
  return String(apiKey || "").trim() === SCRIPTED_AGENT_API_KEY;
};

const delayMs = () => {
  const n = Number(process.env.ALTER_AGENT_SCRIPTED_DELAY_MS || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n), 10000);
};

const isAgentPrompt = (systemInstruction) =>
  /읽기 전용 에이전트/.test(String(systemInstruction || ""));

const sawToolResult = (messages) =>
  (messages || []).some((row) => {
    if (row?.role === "tool") return true;
    if (Array.isArray(row?.toolCalls) && row.toolCalls.length) return true;
    return String(row?.content || "").includes("<tool_result");
  });

/**
 * Fence path (no tools): ```alter get_my_todos, then a fenced final answer.
 * Native path (tools passed): the same turn as OpenAI/Anthropic tool_calls,
 * then a plain-text final answer.
 * @param {{ apiKey?: string, systemInstruction?: string, messages?: object[], tools?: object[] }} params
 * @returns {Promise<{ text: string, toolCalls?: object[], tokenUsage: object } | null>}
 */
export const scriptedAgentGenerate = async ({
  apiKey,
  systemInstruction,
  messages,
  tools,
} = {}) => {
  if (!isAlterAgentScriptedEnabled(apiKey)) return null;
  if (!isAgentPrompt(systemInstruction)) return null;

  const native = Array.isArray(tools) && tools.length > 0;
  const sawResult = sawToolResult(messages);
  const wait = delayMs();
  if (wait) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  if (native) {
    if (!sawResult) {
      return {
        text: "",
        toolCalls: [
          {
            id: "scripted-call-1",
            name: "get_my_todos",
            arguments: { scope: "all", limit: 10 },
          },
        ],
        tokenUsage: { ...TOKEN_USAGE },
      };
    }
    return { text: FINAL_TEXT, toolCalls: [], tokenUsage: { ...TOKEN_USAGE } };
  }
  return {
    text: sawResult ? FINAL_TURN : TOOL_TURN,
    tokenUsage: { ...TOKEN_USAGE },
  };
};

export const SCRIPTED_AGENT_FINAL_TEXT = FINAL_TEXT;
